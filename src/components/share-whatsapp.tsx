"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Enlace de WhatsApp con el mensaje ya escrito, como en Formula Taller (urlWhatsApp):
 * en el teléfono wa.me abre la app; en la computadora va directo a WhatsApp Web, porque la página
 * intermedia de wa.me suele quedarse «cargando». Sin número: WhatsApp deja elegir a qué contactos enviarlo.
 */
export function whatsAppShareUrl(message: string, phone = "") {
  const clean = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (mobile) return `https://wa.me/${clean}?text=${text}`;
  return clean ? `https://web.whatsapp.com/send?phone=${clean}&text=${text}` : `https://web.whatsapp.com/send?text=${text}`;
}

/** Botón para que la tienda comparta su app con sus contactos de WhatsApp */
export function ShareStoreWhatsApp({ storeName, url, className }: { storeName: string; url: string; className?: string }) {
  const share = () => {
    const message = `¡Hola! 👋 Te invito a conocer ${storeName}. Mira nuestros productos, compra desde tu teléfono y descarga nuestra app aquí: ${url}`;
    window.open(whatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  };
  return (
    <button type="button" onClick={share} className={cn("btn bg-[#25D366] text-white hover:bg-[#1ebe5b]", className)}>
      <MessageCircle className="size-4" /> Compartir por WhatsApp
    </button>
  );
}
