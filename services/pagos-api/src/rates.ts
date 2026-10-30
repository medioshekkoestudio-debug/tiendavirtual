// Tasa BCV por día, desde el histórico de dolarapi (la misma fuente que usa Linki App al cobrar).
// El monto en Bs que se espera de un pago lo calcula este servicio con la tasa del día en que se
// registró; no se confía en ningún monto que venga del navegador.

const HISTORICO_URL = "https://ve.dolarapi.com/v1/historicos/dolares/oficial";
const FRESH_MS = 60 * 60_000;

let rows: { date: string; rate: number }[] = [];
let fetchedAt = 0;

async function load() {
  if (rows.length && Date.now() - fetchedAt < FRESH_MS) return rows;
  try {
    const res = await fetch(HISTORICO_URL, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`dolarapi ${res.status}`);
    const data: unknown = await res.json();
    if (!Array.isArray(data)) throw new Error("histórico inválido");
    const parsed = data
      .map((r) => ({ date: String(r?.fecha ?? ""), rate: Number(r?.promedio) }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.rate) && r.rate > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (parsed.length) {
      rows = parsed;
      fetchedAt = Date.now();
    }
  } catch (e) {
    // Se sigue con la última copia; si no hay ninguna la conciliación deja el pago en manual
    console.error("[tasa]", (e as Error).message);
  }
  return rows;
}

/** Día en Caracas (YYYY-MM-DD) */
export function caracasDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(d);
}

/**
 * Tasas con las que la pasarela pudo haber cobrado ese día: la vigente (fecha valor ≤ día) y la
 * siguiente publicada, porque el fin de semana y la tarde en que el BCV ya publicó se muestra esa.
 */
export async function candidateRates(at: Date): Promise<number[]> {
  const all = await load();
  const day = caracasDate(at);
  const idx = all.findLastIndex((r) => r.date <= day);
  const out = [all[idx]?.rate, all[idx + 1]?.rate].filter((r): r is number => !!r);
  return [...new Set(out)];
}
