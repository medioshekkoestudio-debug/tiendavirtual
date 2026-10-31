import type { PeriodKey } from "./constants";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const money = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Montos en dólares con formato venezolano: $1.234,50 */
export function formatMoney(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${n < 0 ? "-" : ""}$${money.format(Math.abs(n))}`;
}

/** Equivalente en bolívares de un monto en dólares, redondeado a céntimos. */
export function toBs(usd: number | string, rate: number) {
  return Math.round(Number(usd) * rate * 100) / 100;
}

/** Montos en bolívares: Bs. 1.234,50 */
export function formatBs(value: number) {
  return `Bs. ${money.format(value)}`;
}

/** Las fechas se muestran en hora de Venezuela: el servidor (Vercel) corre en UTC */
export const TIME_ZONE = "America/Caracas";
const VE_OFFSET_MS = 4 * 3_600_000; // Venezuela es UTC-4 todo el año (sin horario de verano)

export function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-VE", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Inicio del periodo (día, semana, mes, año) o null para "todo". */
export function periodStart(period: PeriodKey): Date | null {
  // Se calcula sobre el reloj de Venezuela y se devuelve el instante real (medianoche de Caracas)
  const ve = new Date(Date.now() - VE_OFFSET_MS);
  const [y, m, d] = [ve.getUTCFullYear(), ve.getUTCMonth(), ve.getUTCDate()];
  const at = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd) + VE_OFFSET_MS);
  switch (period) {
    case "dia":
      return at(y, m, d);
    case "semana":
      return at(y, m, d - ((ve.getUTCDay() + 6) % 7)); // lunes = 0
    case "mes":
      return at(y, m, 1);
    case "anio":
      return at(y, 0, 1);
    default:
      return null;
  }
}

export function parsePeriod(value: string | string[] | undefined, fallback: PeriodKey = "mes"): PeriodKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "dia" || v === "semana" || v === "mes" || v === "anio" || v === "todo" ? v : fallback;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function storeUrl(slug: string) {
  return `${siteUrl()}/${slug}`;
}

/** Texto legible sobre un color de fondo (negro o blanco). */
export function contrastText(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

export function initials(name: string | null | undefined) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
