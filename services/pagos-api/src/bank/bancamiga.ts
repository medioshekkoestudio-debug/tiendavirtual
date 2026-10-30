// Scraper de la banca en línea de Bancamiga (plan B si el banco no ofrece API oficial, §3.1).
//
// PENDIENTE: los selectores de abajo se llenan entrando al portal con un usuario de solo consulta.
// Mientras estén vacíos la cuenta responde «not_configured» y todo sigue en aprobación manual;
// los movimientos se pueden cargar con POST /movements/import para probar la conciliación.

import type { BankCredentials, BankScraper, ScrapedMovement } from "./types.js";
import { LoginError, NotConfiguredError } from "./types.js";

const PORTAL = {
  loginUrl: process.env.BANCAMIGA_LOGIN_URL ?? "",
  user: "",
  password: "",
  submit: "",
  /** Aparece si el usuario o la clave son incorrectos */
  loginError: "",
  /** Aparece cuando ya se entró */
  loggedIn: "",
  /** Cómo llegar al estado de cuenta (clics en orden) */
  toMovements: [] as string[],
  /** Filas de la tabla de movimientos */
  rows: "",
  logout: "",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.5));

/** "1.234,56" → 1234.56 */
function parseAmount(text: string) {
  const n = Number(text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** "29/10/2026" → "2026-10-29" */
function parseDate(text: string) {
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export const bancamiga: BankScraper = {
  async fetchMovements(credentials: BankCredentials, since: Date): Promise<ScrapedMovement[]> {
    if (!PORTAL.loginUrl || !PORTAL.user || !PORTAL.rows) {
      throw new NotConfiguredError("Falta mapear el portal de Bancamiga (src/bank/bancamiga.ts)");
    }
    // Import dinámico: el servicio arranca aunque el navegador no esté instalado
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ locale: "es-VE", timezoneId: "America/Caracas" });
      await page.goto(PORTAL.loginUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await wait(800);
      await page.fill(PORTAL.user, credentials.username);
      await wait(500);
      await page.fill(PORTAL.password, credentials.password);
      await wait(400);
      await page.click(PORTAL.submit);

      const outcome = await Promise.race([
        page.waitForSelector(PORTAL.loggedIn, { timeout: 30_000 }).then(() => "ok" as const),
        page.waitForSelector(PORTAL.loginError, { timeout: 30_000 }).then(() => "error" as const),
      ]);
      if (outcome === "error") throw new LoginError("Bancamiga rechazó el usuario o la clave");

      for (const step of PORTAL.toMovements) {
        await wait(700);
        await page.click(step);
      }
      await page.waitForSelector(PORTAL.rows, { timeout: 30_000 });

      // Ajustar las columnas al formato real de la tabla
      const rows = await page.$$eval(PORTAL.rows, (trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent ?? "").trim())),
      );
      const sinceDay = since.toISOString().slice(0, 10);
      const out: ScrapedMovement[] = [];
      for (const [fecha, referencia, descripcion, monto] of rows) {
        const date = parseDate(fecha ?? "");
        const amount = parseAmount(monto ?? "");
        if (!date || date < sinceDay || !referencia || !Number.isFinite(amount) || amount === 0) continue;
        out.push({ date, reference: referencia, amount: Math.abs(amount), type: amount > 0 ? "credito" : "debito", description: descripcion });
      }

      if (PORTAL.logout) await page.click(PORTAL.logout).catch(() => {});
      return out;
    } finally {
      await browser.close();
    }
  },
};
