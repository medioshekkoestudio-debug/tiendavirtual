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

export function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Inicio del periodo (día, semana, mes, año) o null para "todo". */
export function periodStart(period: PeriodKey): Date | null {
  const now = new Date();
  switch (period) {
    case "dia":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "semana": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const day = (d.getDay() + 6) % 7; // lunes = 0
      d.setDate(d.getDate() - day);
      return d;
    }
    case "mes":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "anio":
      return new Date(now.getFullYear(), 0, 1);
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
