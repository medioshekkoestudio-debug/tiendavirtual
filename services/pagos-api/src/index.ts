// pagos-api: servicio de Linki App en Railway. Solo servidor a servidor, con token Bearer.
//   OCR de comprobantes · movimientos del banco · conciliación automática (o en modo sombra)

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { minutesSince, saveMovements, scrapeAccount, type BankAccount } from "./bank/scrape.js";
import type { ScrapedMovement } from "./bank/types.js";
import { conciliar, ocrPayment, purgeRuns } from "./conciliar.js";
import { encrypt, sameSecret } from "./crypto.js";
import { db, PAYMENT_TABLE, type PaymentKind } from "./db.js";
import { env } from "./env.js";
import { OcrError, readReceipt } from "./ocr.js";

const app = new Hono();
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const isKind = (v: unknown): v is PaymentKind => v === "suscripcion" || v === "comision";

// Sin token solo responde /health (sin detalles), para el chequeo de Railway
app.use("*", async (c, next) => {
  if (c.req.path === "/health" && !c.req.header("authorization")) return next();
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !sameSecret(token, env.apiToken)) return c.json({ error: "No autorizado" }, 401);
  return next();
});

app.onError((e, c) => {
  if (e instanceof OcrError) return c.json({ error: e.message }, e.status);
  console.error(e);
  return c.json({ error: "Error interno" }, 500);
});

/** Estado para el semáforo del Superadmin: verde < 10 min, amarillo < 30, rojo */
app.get("/health", async (c) => {
  if (!c.req.header("authorization")) return c.json({ ok: true });
  const [{ data: accounts }, { data: runs }] = await Promise.all([
    db.from("bank_accounts").select("id, label, bank, active, paused_reason, last_scraped_at, last_error"),
    db.from("conciliation_runs").select("*").order("started_at", { ascending: false }).limit(1),
  ]);
  return c.json({
    ok: true,
    auto_approve: env.autoApprove,
    ocr: !!env.anthropicKey,
    ocr_model: env.ocrModel,
    accounts: (accounts ?? []).map((a) => {
      const min = minutesSince(a.last_scraped_at);
      return { ...a, light: !a.active || a.last_error || min >= 30 ? "rojo" : min >= 10 ? "amarillo" : "verde" };
    }),
    last_run: runs?.[0] ?? null,
  });
});

/**
 * Lee un comprobante.
 *  - { kind, payment_id }: el del pago guardado; deja el resultado en payment_validations.
 *  - { image_base64, media_type }: una imagen suelta (para llenar referencia y monto en el checkout). No guarda nada.
 */
app.post("/ocr", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const kind: unknown = body.kind;
  if (isKind(kind) && isUuid(body.payment_id)) {
    const { data: p } = await db.from(PAYMENT_TABLE[kind]).select("id, receipt_path").eq("id", body.payment_id).maybeSingle();
    if (!p) return c.json({ error: "Pago no encontrado" }, 404);
    const r = await ocrPayment({ kind, id: p.id, receipt_path: p.receipt_path });
    return c.json(r.legible ? r : { ...r, message: "No pudimos leer tu comprobante, adjunta uno más legible" }, r.legible ? 200 : 422);
  }
  if (typeof body.image_base64 === "string") {
    const data = Buffer.from(body.image_base64, "base64");
    const r = await readReceipt(data, "comprobante", body.media_type);
    return c.json(r.legible ? r : { ...r, message: "No pudimos leer tu comprobante, adjunta uno más legible" }, r.legible ? 200 : 422);
  }
  return c.json({ error: "Envía { kind, payment_id } o { image_base64, media_type }" }, 400);
});

/** Movimientos guardados. No toca el banco */
app.get("/movements", async (c) => {
  const account = c.req.query("account");
  const since = c.req.query("since");
  const tail = c.req.query("tail");
  let q = db.from("bank_movements").select("*").order("date", { ascending: false }).order("scraped_at", { ascending: false }).limit(500);
  if (isUuid(account)) q = q.eq("account_id", account);
  if (since && /^\d{4}-\d{2}-\d{2}$/.test(since)) q = q.gte("date", since);
  if (tail && /^\d{1,6}$/.test(tail)) q = q.eq("reference_tail", tail);
  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ movements: data });
});

/** Carga movimientos a mano (estado de cuenta exportado) para probar la conciliación sin scraper */
app.post("/movements/import", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!isUuid(body.account_id) || !Array.isArray(body.movements)) return c.json({ error: "Envía { account_id, movements: [...] }" }, 400);
  const movements: ScrapedMovement[] = [];
  for (const m of body.movements.slice(0, 1000)) {
    const amount = Number(m?.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m?.date ?? "") || !m?.reference || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: "Cada movimiento necesita date (YYYY-MM-DD), reference y amount > 0", movement: m }, 400);
    }
    movements.push({ date: m.date, reference: String(m.reference), amount, type: m.type === "debito" ? "debito" : "credito", description: m.description, origin_bank: m.origin_bank, origin_id: m.origin_id });
  }
  const inserted = await saveMovements(body.account_id, movements);
  return c.json({ received: movements.length, inserted });
});

/** Pide entrar al banco ya. Si está en enfriamiento dice cuándo */
app.post("/scrape", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!isUuid(body.account)) return c.json({ error: "Envía { account }" }, 400);
  const { data } = await db.from("bank_accounts").select("*").eq("id", body.account).maybeSingle();
  if (!data) return c.json({ error: "Cuenta no encontrada" }, 404);
  const r = await scrapeAccount(data as BankAccount, { force: body.force === true });
  return c.json(r, r.result === "cooldown" ? 429 : 200);
});

/** Crea o actualiza una cuenta del banco. Las credenciales se guardan cifradas y nunca se devuelven */
app.post("/accounts", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  if (!label || body.bank !== "bancamiga") return c.json({ error: "Envía { label, bank: 'bancamiga', account_masked, username, password }" }, 400);
  const row: Record<string, unknown> = { label, bank: body.bank, account_masked: String(body.account_masked ?? "").slice(-8) };
  if (body.username && body.password) {
    row.credentials = encrypt({ username: String(body.username), password: String(body.password), extra: body.extra ?? undefined });
    row.active = true;
    row.paused_reason = null;
    row.login_failures = 0;
  }
  const { data, error } = await db.from("bank_accounts").upsert(row, { onConflict: "label" }).select("id, label, bank, account_masked, active").single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

/** Una pasada de conciliación ya (además del reloj interno) */
app.post("/conciliar", async (c) => c.json(await conciliar()));

// Reloj interno: una pasada por minuto y limpieza del diario cada 6 h
if (env.scheduler) {
  setInterval(() => void conciliar(), 60_000);
  setInterval(() => void purgeRuns(), 6 * 3_600_000);
  setTimeout(() => void conciliar(), 5_000);
}

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`pagos-api en :${info.port} · ${env.autoApprove ? "APRUEBA SOLO" : "modo sombra"} · OCR ${env.anthropicKey ? env.ocrModel : "apagado"}`);
});
