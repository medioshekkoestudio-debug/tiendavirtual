// Lector de comprobantes con un modelo de visión (planValidacionAutomatica.md §4).
// El OCR no valida dinero: solo evita referencias mal tecleadas y guarda el origen del pago.
// Quien manda para aprobar es el movimiento del banco.

import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db.js";
import { env } from "./env.js";

const client = env.anthropicKey ? new Anthropic({ apiKey: env.anthropicKey }) : null;

export type OcrResult = {
  legible: boolean;
  /** Referencia completa, solo dígitos */
  full_reference: string | null;
  /** Últimos 6 dígitos */
  reference: string | null;
  amount: number | null;
  currency: "VES" | "USD" | null;
  date: string | null;
  bank: string | null;
  origin_bank: string | null;
  origin_id: string | null;
  origin_phone: string | null;
  confidence: "alta" | "media" | "baja";
  raw: unknown;
};

export class OcrError extends Error {
  constructor(message: string, readonly status: 400 | 415 | 422 | 502 | 503) {
    super(message);
  }
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const nullable = (type: string, extra: Record<string, unknown> = {}) => ({ anyOf: [{ type, ...extra }, { type: "null" }] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["legible", "reference", "amount", "currency", "date", "bank", "origin_bank", "origin_id", "origin_phone", "destination_phone", "destination_id", "confidence"],
  properties: {
    legible: { type: "boolean", description: "true si es un comprobante de pago y se leen la referencia y el monto" },
    reference: nullable("string", { description: "Número de referencia u operación completo, tal cual aparece" }),
    amount: nullable("number", { description: "Monto pagado, con decimales (punto decimal)" }),
    currency: nullable("string", { enum: ["VES", "USD"] }),
    date: nullable("string", { description: "Fecha del pago en formato YYYY-MM-DD" }),
    bank: nullable("string", { description: "Banco que emite el comprobante" }),
    origin_bank: nullable("string", { description: "Banco del que paga" }),
    origin_id: nullable("string", { description: "Cédula o RIF del que paga" }),
    origin_phone: nullable("string", { description: "Teléfono del que paga" }),
    destination_phone: nullable("string", { description: "Teléfono que recibe el pago" }),
    destination_id: nullable("string", { description: "Cédula o RIF que recibe el pago" }),
    confidence: { type: "string", enum: ["alta", "media", "baja"] },
  },
} as const;

const PROMPT = `Eres un lector de comprobantes de pago de bancos venezolanos (Pago Móvil, transferencias).
Extrae los datos del comprobante de la imagen. Reglas:
- Copia la referencia completa, dígito por dígito. Cuida los dígitos repetidos (66, 000): no los juntes.
- El monto en bolívares usa coma decimal en Venezuela ("1.234,56" = 1234.56). Devuélvelo con punto decimal.
- Distingue al que paga (origen) del que recibe (destino). Si no sabes a cuál pertenece un dato, déjalo en null.
- No inventes datos. Lo que no se lea con claridad va en null y baja la confianza.
- Si la imagen no es un comprobante de pago, legible = false.`;

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");

/** Datos de cobro de Linki App (teléfono, cédula, cuenta) para no confundirlos con los del que paga */
async function ownDigits(): Promise<Set<string>> {
  const { data } = await db.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle();
  const out = new Set<string>();
  const methods = (data?.payment_methods ?? {}) as Record<string, { details?: { value?: string }[] }>;
  for (const m of Object.values(methods)) {
    for (const d of m?.details ?? []) {
      const n = digits(d?.value);
      if (n.length >= 6) {
        out.add(n);
        // 0412-8364248 también aparece como 584128364248 o 4128364248
        out.add(n.replace(/^0/, ""));
        out.add(`58${n.replace(/^0/, "")}`);
      }
    }
  }
  return out;
}

function mediaTypeOf(name: string, given?: string): ImageType | "application/pdf" {
  const t = (given ?? "").toLowerCase();
  if ((IMAGE_TYPES as readonly string[]).includes(t)) return t as ImageType;
  if (t === "application/pdf") return t;
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  throw new OcrError("Formato no soportado: adjunta el comprobante en JPG, PNG o PDF", 415);
}

/** Lee un comprobante. Lanza OcrError con el código HTTP que corresponde. */
export async function readReceipt(data: Buffer, name: string, mediaType?: string): Promise<OcrResult> {
  if (!client) throw new OcrError("El OCR no está configurado (falta ANTHROPIC_API_KEY)", 503);
  if (!data.length) throw new OcrError("El archivo está vacío", 400);
  if (data.length > 5 * 1024 * 1024) throw new OcrError("El comprobante pesa más de 5 MB", 400);
  const type = mediaTypeOf(name, mediaType);
  const b64 = data.toString("base64");
  const file: Anthropic.Beta.BetaContentBlockParam =
    type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: type, data: b64 } }
      : { type: "image", source: { type: "base64", media_type: type, data: b64 } };

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: env.ocrModel,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [file, { type: "text", text: PROMPT }] }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new OcrError("El OCR está ocupado, intenta en un momento", 503);
    if (e instanceof Anthropic.APIError) throw new OcrError(`Error del OCR (${e.status ?? "red"})`, 502);
    throw e;
  }
  if (response.stop_reason === "refusal") throw new OcrError("No se pudo leer el comprobante", 422);
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text ?? "");
  } catch {
    throw new OcrError("Respuesta del OCR inválida", 502);
  }

  // Validaciones propias: nunca se confía a ciegas en el modelo
  const own = await ownDigits();
  const notOurs = (v: unknown) => {
    const d = digits(v);
    return d && !own.has(d) && !own.has(d.replace(/^0/, "")) ? d : null;
  };
  const ref = digits(raw.reference);
  const full_reference = ref.length >= 4 && !own.has(ref) ? ref : null;
  const amount = typeof raw.amount === "number" && Number.isFinite(raw.amount) && raw.amount > 0 ? Math.round(raw.amount * 100) / 100 : null;
  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);
  const confidence = raw.confidence === "alta" || raw.confidence === "media" ? raw.confidence : "baja";

  return {
    legible: raw.legible === true && !!full_reference && amount !== null,
    full_reference,
    reference: full_reference ? full_reference.slice(-6) : null,
    amount,
    currency: raw.currency === "USD" ? "USD" : raw.currency === "VES" ? "VES" : null,
    date,
    bank: str(raw.bank),
    origin_bank: str(raw.origin_bank),
    origin_id: notOurs(raw.origin_id),
    origin_phone: notOurs(raw.origin_phone),
    confidence,
    raw: { ...raw, model: response.model, usage: response.usage },
  };
}

/** Descarga el comprobante del bucket privado */
export async function downloadReceipt(path: string) {
  const { data, error } = await db.storage.from("payment-receipts").download(path);
  if (error || !data) throw new OcrError("No se encontró el comprobante", 400);
  return { data: Buffer.from(await data.arrayBuffer()), mediaType: data.type };
}
