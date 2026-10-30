// Conciliación (planValidacionAutomatica.md §1.3 y §5): empareja los pagos pendientes por Pago Móvil
// con los movimientos del banco y aprueba solo los que cumplen todas las reglas.
// Regla de oro: nunca rechaza. Lo que no cuadra queda pendiente con su motivo escrito.

import { scrapeDueAccounts } from "./bank/scrape.js";
import { db, PAYMENT_TABLE, type PaymentKind, type PendingPayment } from "./db.js";
import { env } from "./env.js";
import { downloadReceipt, OcrError, readReceipt } from "./ocr.js";
import { caracasDate, candidateRates } from "./rates.js";

const LOOKBACK_DAYS = 3;
const HOUR = 3_600_000;

type Validation = {
  payment_kind: PaymentKind;
  payment_id: string;
  ocr_reference: string | null;
  ocr_amount: number | null;
  ocr_at: string | null;
  status_note: string | null;
  shadow_movement_id: string | null;
};

type Movement = { id: string; date: string; reference: string; reference_tail: string; amount: number };

const tailOf = (ref: string | null | undefined) => {
  const d = (ref ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-6) : null;
};
const tolerance = (ves: number) => Math.max(0.5, ves * 0.005);
const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const key = (kind: PaymentKind, id: string) => `${kind}:${id}`;

async function pendingPayments(): Promise<PendingPayment[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * HOUR).toISOString();
  const out: PendingPayment[] = [];
  for (const kind of Object.keys(PAYMENT_TABLE) as PaymentKind[]) {
    const { data, error } = await db
      .from(PAYMENT_TABLE[kind])
      .select("id, store_id, amount_usd, method, reference, receipt_path, created_at")
      .eq("status", "pendiente")
      .eq("method", "pago_movil")
      .gte("created_at", since)
      .order("created_at")
      .limit(500);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) out.push({ ...p, kind, amount_usd: Number(p.amount_usd) } as PendingPayment);
  }
  return out;
}

/** Colas de referencia de pagos ya aprobados (también los aprobados a mano), para no cobrar dos veces el mismo pago */
async function approvedTails(): Promise<Map<string, string>> {
  const since = new Date(Date.now() - 30 * 24 * HOUR).toISOString();
  const out = new Map<string, string>();
  for (const kind of Object.keys(PAYMENT_TABLE) as PaymentKind[]) {
    const { data } = await db
      .from(PAYMENT_TABLE[kind])
      .select("id, reference")
      .eq("status", "aprobado")
      .eq("method", "pago_movil")
      .gte("created_at", since)
      .limit(1000);
    for (const p of data ?? []) {
      const t = tailOf(p.reference);
      if (t) out.set(t, key(kind, p.id));
    }
  }
  const { data: ocr } = await db
    .from("payment_validations")
    .select("payment_kind, payment_id, ocr_reference")
    .not("validated_at", "is", null)
    .gte("validated_at", since);
  for (const v of ocr ?? []) if (v.ocr_reference) out.set(v.ocr_reference, key(v.payment_kind, v.payment_id));
  return out;
}

/** Lee el comprobante y guarda el resultado (también el error, para no reintentarlo cada minuto) */
export async function ocrPayment(p: Pick<PendingPayment, "kind" | "id" | "receipt_path">) {
  if (!p.receipt_path) throw new OcrError("El pago no tiene comprobante", 400);
  const now = new Date().toISOString();
  try {
    const file = await downloadReceipt(p.receipt_path);
    const r = await readReceipt(file.data, p.receipt_path, file.mediaType);
    await db.from("payment_validations").upsert({
      payment_kind: p.kind,
      payment_id: p.id,
      ocr_legible: r.legible,
      ocr_reference: r.reference,
      ocr_amount: r.currency === "USD" ? null : r.amount,
      ocr_date: r.date,
      ocr_bank: r.bank,
      ocr_origin_bank: r.origin_bank,
      ocr_origin_id: r.origin_id,
      ocr_raw: r.raw,
      ocr_error: null,
      ocr_at: now,
      updated_at: now,
    });
    return r;
  } catch (e) {
    const message = e instanceof OcrError ? e.message : "Error leyendo el comprobante";
    // Sin clave del OCR no se marca: se leerá cuando se configure
    if (!(e instanceof OcrError && e.status === 503)) {
      await db.from("payment_validations").upsert({ payment_kind: p.kind, payment_id: p.id, ocr_error: message, ocr_at: now, updated_at: now });
    }
    throw e;
  }
}

let busy = false;

/** Una pasada completa. Si otra sigue en curso no hace nada (además la base tiene su propio cerrojo). */
export async function conciliar() {
  if (busy) return { skipped: true };
  busy = true;
  const started = Date.now();
  const stats = { pending: 0, approved: 0, shadow: 0, ocr_reads: 0, error: null as string | null };
  try {
    const pending = await pendingPayments();
    stats.pending = pending.length;
    await scrapeDueAccounts(pending.length > 0);
    if (!pending.length) return stats;

    const { data: vals } = await db
      .from("payment_validations")
      .select("payment_kind, payment_id, ocr_reference, ocr_amount, ocr_at, status_note, shadow_movement_id")
      .in("payment_id", pending.map((p) => p.id));
    const validations = new Map(((vals ?? []) as Validation[]).map((v) => [key(v.payment_kind, v.payment_id), v]));

    // 1. OCR de los comprobantes que aún no se leyeron (con tope por pasada para cuidar el costo)
    for (const p of pending) {
      if (stats.ocr_reads >= env.ocrMaxPerPass) break;
      if (validations.get(key(p.kind, p.id))?.ocr_at || !p.receipt_path) continue;
      stats.ocr_reads++;
      try {
        const r = await ocrPayment(p);
        validations.set(key(p.kind, p.id), {
          payment_kind: p.kind, payment_id: p.id, ocr_reference: r.reference,
          ocr_amount: r.currency === "USD" ? null : r.amount, ocr_at: new Date().toISOString(), status_note: null, shadow_movement_id: null,
        });
      } catch (e) {
        if (e instanceof OcrError && e.status === 503) break;
      }
    }

    // 2. Movimientos libres de los últimos días
    const oldest = pending.reduce((a, p) => Math.min(a, new Date(p.created_at).getTime()), Date.now());
    const { data: movs, error: movErr } = await db
      .from("bank_movements")
      .select("id, date, reference, reference_tail, amount")
      .eq("type", "credito")
      .is("used_at", null)
      .gte("date", caracasDate(new Date(oldest - 24 * HOUR)))
      .limit(1000);
    if (movErr) throw new Error(movErr.message);
    const movements = ((movs ?? []) as Movement[]).map((m) => ({ ...m, amount: Number(m.amount) }));
    const used = await approvedTails();

    // 3. Emparejar
    for (const p of pending) {
      const v = validations.get(key(p.kind, p.id));
      const created = new Date(p.created_at);
      const rates = await candidateRates(created);
      const expected = rates.map((r) => Math.round(p.amount_usd * r * 100) / 100);
      let note: string;
      let shadowId: string | null = null;

      const typed = tailOf(p.reference);
      const read = v?.ocr_reference ?? null;
      const tail = read ?? typed;
      const from = caracasDate(new Date(created.getTime() - 24 * HOUR));
      const to = caracasDate(new Date(created.getTime() + 2 * HOUR));

      if (!expected.length) note = "Sin tasa BCV para calcular el monto en Bs";
      else if (read && typed && read !== typed) note = `La referencia escrita (…${typed}) no coincide con la del comprobante (…${read})`;
      else if (!tail) note = "Sin referencia legible";
      else if (used.has(tail) && used.get(tail) !== key(p.kind, p.id)) note = `La referencia …${tail} ya pagó otro pago aprobado`;
      else {
        const sameRef = movements.filter((m) => m.reference_tail === tail && m.date >= from && m.date <= to);
        const matches = sameRef.filter((m) => expected.some((e) => Math.abs(m.amount - e) <= tolerance(e)));
        if (!sameRef.length) note = "Aún no aparece en el banco";
        else if (!matches.length) {
          note = `Monto distinto: llegaron ${fmt(sameRef[0].amount)} Bs y se esperaban ${expected.map(fmt).join(" o ")} Bs`;
        } else if (matches.length > 1) note = `Hay ${matches.length} movimientos con la misma referencia y monto: revisar a mano`;
        else if (v?.ocr_amount != null && Math.abs(v.ocr_amount - matches[0].amount) > tolerance(matches[0].amount)) {
          note = `El comprobante dice ${fmt(v.ocr_amount)} Bs y el banco ${fmt(matches[0].amount)} Bs`;
        } else {
          const m = matches[0];
          if (env.autoApprove) {
            const { error } = await db.rpc("auto_approve_payment", {
              p_kind: p.kind,
              p_id: p.id,
              p_movement: m.id,
              p_note: `Aprobado automáticamente: ${fmt(m.amount)} Bs, ref. ${m.reference} del ${m.date}`,
            });
            if (!error) {
              stats.approved++;
              movements.splice(movements.indexOf(m), 1);
              used.set(tail, key(p.kind, p.id));
              continue;
            }
            note = `No se pudo aprobar: ${error.message}`;
          } else {
            stats.shadow++;
            shadowId = m.id;
            note = `Modo sombra: se habría aprobado con ${fmt(m.amount)} Bs, ref. ${m.reference} del ${m.date}`;
          }
        }
      }

      if (v?.status_note !== note || v?.shadow_movement_id !== shadowId) {
        await db.from("payment_validations").upsert({
          payment_kind: p.kind,
          payment_id: p.id,
          expected_ves: expected[0] ?? null,
          rate: rates[0] ?? null,
          status_note: note,
          shadow_movement_id: shadowId,
          updated_at: new Date().toISOString(),
        });
      }
    }
    return stats;
  } catch (e) {
    stats.error = (e as Error).message.slice(0, 500);
    console.error("[conciliar]", stats.error);
    return stats;
  } finally {
    busy = false;
    await db.from("conciliation_runs").insert({ duration_ms: Date.now() - started, ...stats });
  }
}

/** El diario guarda 7 días */
export async function purgeRuns() {
  const before = new Date(Date.now() - 7 * 24 * HOUR).toISOString();
  await db.from("conciliation_runs").delete().lt("started_at", before);
  await db.from("bank_scrape_runs").delete().lt("started_at", before);
}
