import { after } from "next/server";
import type { Registration } from "@/lib/registration";
import { siteUrl } from "@/lib/utils";

/**
 * Avisa por WhatsApp al administrador de Linki App (registros y pagos) con CallMeBot.
 * Necesita ADMIN_WHATSAPP_PHONE (ej. 584128364248) y CALLMEBOT_APIKEY; sin ellas no hace nada.
 * Se envía después de responder, así un fallo o una demora de CallMeBot nunca frena al usuario.
 */
export function notifyAdmin(lines: (string | false | null | undefined)[]) {
  const phone = process.env.ADMIN_WHATSAPP_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;
  const text = lines.filter(Boolean).join("\n");
  after(async () => {
    try {
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
