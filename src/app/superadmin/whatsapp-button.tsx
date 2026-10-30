"use client";

import { MessageCircle } from "lucide-react";
import { whatsAppShareUrl } from "@/components/share-whatsapp";
import { whatsAppNumber } from "@/lib/activity";
import { cn } from "@/lib/utils";

/** Abre una conversación de WhatsApp con el dueño de la tienda (WhatsApp Web en la computadora) */
export function WhatsAppUserButton({ phone, name, compact = false }: { phone: string | null; name?: string | null; compact?: boolean }) {
  const number = whatsAppNumber(phone);
  if (!number) return compact ? <span className="text-xs text-slate-400">Sin teléfono</span> : null;
  const first = (name ?? "").trim().split(/\s+/)[0];
  const open = () =>
    window.open(whatsAppShareUrl(`Hola${first ? ` ${first}` : ""}, te escribimos de Linki App.`, number), "_blank", "noopener,noreferrer");
  return (
    <button
      type="button"
      onClick={open}
      className={cn("btn bg-[#25D366] text-white hover:bg-[#1ebe5b]", compact ? "px-2.5 py-1.5 text-xs" : "")}
      title={`WhatsApp ${phone}`}
    >
      <MessageCircle className="size-4" /> {compact ? "WhatsApp" : "Escribir por WhatsApp"}
    </button>
  );
}
