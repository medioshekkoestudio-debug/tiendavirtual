// Solo servidor. Tasa oficial BCV vía dolarapi.com (la web del BCV falla TLS desde servidores; dolarapi replica el valor oficial).
// Misma lógica que La Mejor Llave (planTasaBcv.md §2):
//  - sábado y domingo (hora de Caracas) se usa la tasa del lunes, que ya está en el histórico desde el viernes;
//  - caché en memoria de 1 h; si dolarapi falla se sirve la última conocida y no se reintenta en 5 min,
//    para que una API externa lenta no vuelva lenta la pasarela.

const OFICIAL_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const HISTORICO_URL = "https://ve.dolarapi.com/v1/historicos/dolares/oficial";
const FRESH_MS = 60 * 60_000;
const FAIL_COOLDOWN_MS = 5 * 60_000;

export type BcvRate = { rate: number; date: string };

let cached: BcvRate | null = null;
let cachedAt = 0;
let cachedWeekend = false;
let failedAt = 0;

function isWeekendInVenezuela(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", weekday: "short" }).format(now);
  return day === "Sat" || day === "Sun";
}

async function fetchOficial(): Promise<BcvRate> {
  const res = await fetch(OFICIAL_URL, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
  if (!res.ok) throw new Error(`dolarapi ${res.status}`);
  const data = await res.json();
  const rate = Number(data?.promedio);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("tasa inválida");
  return { rate, date: String(data?.fechaActualizacion ?? new Date().toISOString()).slice(0, 10) };
}

// La fila con la fecha valor más reciente: el fin de semana es la del lunes (o el siguiente día hábil)
async function fetchLatestPublished(): Promise<BcvRate> {
  const res = await fetch(HISTORICO_URL, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`dolarapi histórico ${res.status}`);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) throw new Error("histórico inválido");
  let best: BcvRate | null = null;
  for (const r of rows) {
    const date = typeof r?.fecha === "string" ? r.fecha : "";
    const rate = Number(r?.promedio);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(rate) || rate <= 0) continue;
    if (!best || date > best.date) best = { rate, date };
  }
  if (!best) throw new Error("histórico sin tasas");
  return best;
}

async function fetchRate(weekend: boolean) {
  if (weekend) {
    try {
      return await fetchLatestPublished();
    } catch {
      // Sin histórico: la del viernes
    }
  }
  return fetchOficial();
}

/** Tasa BCV vigente, o null si nunca se pudo obtener. Nunca lanza. */
export async function getBcvRate(): Promise<BcvRate | null> {
  const now = Date.now();
  const weekend = isWeekendInVenezuela();
  if (cached && cachedWeekend === weekend && now - cachedAt < FRESH_MS) return cached;
  if (failedAt && now - failedAt < FAIL_COOLDOWN_MS) return cached;
  try {
    cached = await fetchRate(weekend);
    cachedAt = now;
    cachedWeekend = weekend;
    failedAt = 0;
  } catch {
    failedAt = now;
  }
  return cached;
}
