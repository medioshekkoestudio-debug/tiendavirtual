"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { Honeypot } from "@/components/honeypot";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getGuestMessages, sendGuestMessage, startGuestChat } from "./guest-actions";

const POLL_MS = 5000;
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

/** Chat para quien no inició sesión: pide su nombre en el primer mensaje y luego consulta las respuestas cada pocos segundos. */
export function GuestChat({ storeId, slug, storeName, initialMessages }: { storeId: string; slug: string; storeName: string; initialMessages: Message[] | null }) {
  const [messages, setMessages] = useState<Message[] | null>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = messages !== null;

  // Sin tiempo real para invitados: se consultan los mensajes mientras la pestaña está visible
  useEffect(() => {
    if (!started) return;
    const tick = () => {
      if (document.visibilityState === "visible") getGuestMessages(storeId).then((m) => m && setMessages(m));
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [started, storeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  function start(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await startGuestChat(fd);
      if (res.error) return setError(res.error);
      setMessages((await getGuestMessages(storeId)) ?? []);
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await sendGuestMessage(storeId, body);
      if (res.error) return setError(res.error);
      setText("");
      setMessages((await getGuestMessages(storeId)) ?? []);
    });
  }

  if (!started) {
    return (
      <form action={start} className="relative mx-auto w-full max-w-md space-y-3 p-4">
        <p className="text-sm text-slate-600">Escríbele a {storeName} sin crear una cuenta. Te responderán aquí mismo.</p>
        <input type="hidden" name="store_id" value={storeId} />
        <Honeypot />
        <div>
          <label className="label" htmlFor="guest-name">Tu nombre</label>
          <input id="guest-name" name="name" className="input" required minLength={2} maxLength={80} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="guest-phone">Teléfono o WhatsApp (opcional)</label>
          <input id="guest-phone" name="phone" className="input" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="0414-1234567" />
        </div>
        <div>
          <label className="label" htmlFor="guest-body">Mensaje</label>
          <textarea id="guest-body" name="body" className="input min-h-24" required maxLength={2000} placeholder={`¡Hola! Quisiera saber…`} />
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensaje"}
        </button>
        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/${slug}/login?next=${encodeURIComponent(`/${slug}/mensajes`)}`} className="font-medium text-brand underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.sender_id === null;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm", mine ? "rounded-br-md bg-brand text-on-brand" : "rounded-bl-md bg-white text-slate-800")}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-0.5 text-right text-[10px]", mine ? "opacity-75" : "text-slate-400")}>{time(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-3 text-xs text-rose-600">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 bg-white p-2">
        <input className="input" placeholder={`Escríbele a ${storeName}…`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="btn-primary px-3" disabled={pending || !text.trim()} aria-label="Enviar">
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </div>
  );
}
