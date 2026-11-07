"use client";

import { usePathname } from "next/navigation";
import { SITE_DOMAIN, SUPPORT_WHATSAPP } from "@/lib/constants";
import { WHATSAPP_ICON_PATH } from "@/lib/whatsapp-icon";

/**
 * Botón pequeño de soporte de Linki App para el dueño de la tienda (panel y configuración inicial).
 * Abre WhatsApp con atención al cliente y un mensaje que ya dice qué tienda escribe.
 * Flota sobre la barra inferior en el teléfono; en Mensajes se oculta para no tapar el botón de enviar.
 */
export function SupportButton({ storeName, slug }: { storeName: string; slug: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/panel/mensajes")) return null;
  const text = `¡Hola! Soy de la tienda «${storeName}» (${SITE_DOMAIN}/${slug}). Necesito ayuda con: `;
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte de Linki App por WhatsApp"
      title="Habla con soporte de Linki App"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] py-1.5 pl-2 pr-3 text-xs font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-105 lg:bottom-5 lg:right-5"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d={WHATSAPP_ICON_PATH} />
      </svg>
      Soporte
    </a>
  );
}
