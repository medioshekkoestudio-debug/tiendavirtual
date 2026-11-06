import { after } from "next/server";
import type { Registration } from "@/lib/registration";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/utils";

/** Atención al cliente de Linki App: +58 422-5465427. Aquí llegan los avisos de registros y pagos. */
export const SUPPORT_WHATSAPP = "584225465427";

type Lines = (string | false | null | undefined)[];

/**
 * Avisa por WhatsApp a atención al cliente de Linki App (registros y pagos) con CallMeBot.
 * El número sale de ADMIN_WHATSAPP_PHONE o, si no está, de SUPPORT_WHATSAPP. Necesita CALLMEBOT_APIKEY
 * (la clave es de ese número: se pide desde ese mismo WhatsApp); sin ella no hace nada.
 * CallMeBot solo envía texto: el comprobante va como enlace. Se envía después de responder, así un fallo
 * o una demora de CallMeBot nunca frena al usuario.
 */
export function notifyAdmin(lines: Lines | (() => Promise<Lines>)) {
  const phone = process.env.ADMIN_WHATSAPP_PHONE || SUPPORT_WHATSAPP;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!apikey) return;
  after(async () => {
    try {
      const text = (typeof lines === "function" ? await lines() : lines).filter(Boolean).join("\n");
      const q = new URLSearchParams({ phone, text, apikey });
      const res = await fetch(`https://api.callmebot.com/whatsapp.php?${q}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) console.error("Aviso de WhatsApp al admin falló:", res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.error("Aviso de WhatsApp al admin falló:", e);
    }
  });
}

export const adminLink = (path: string) => `${siteUrl()}${path}`;

/** Líneas comunes de un registro nuevo */
export const signupLines = (r: Registration, via: string) => [
  "🆕 *Nuevo registro en Linki App*",
  `Empresa: ${r.company}`,
  `Nombre: ${r.fullName}`,
  `Email: ${r.email}`,
  `Teléfono: ${r.phone}`,
  r.industry && `Rubro: ${r.industry}`,
  `Vía: ${via}`,
];

/** Nombre, email y teléfono de quien paga (dueño de la tienda) */
export async function payerLines(userId: string): Promise<Lines> {
  const { data: p } = await createAdminClient().from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle();
  if (!p) return [];
  return [p.full_name && `Nombre: ${p.full_name}`, p.email && `Email: ${p.email}`, p.phone && `Teléfono: ${p.phone}`];
}

/**
 * Enlace al comprobante (bucket privado), válido 7 días. Si no se puede firmar, no se pone:
 * el comprobante igual queda guardado y se ve en el Superadmin.
 */
export async function receiptLine(path: string): Promise<string | null> {
  const { data } = await createAdminClient().storage.from("payment-receipts").createSignedUrl(path, 7 * 24 * 3600);
  return data?.signedUrl ? `🧾 Comprobante: ${data.signedUrl}` : null;
}
