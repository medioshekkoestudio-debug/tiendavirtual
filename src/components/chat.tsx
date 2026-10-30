"use client";

import { useDraftState } from "@/lib/draft";
import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

const time = (iso: string) => new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" });

/** Chat en tiempo real (Supabase Realtime) entre cliente y tienda. */
export function Chat({
  conversationId,
  currentUserId,
  initialMessages,
  placeholder = "Escribe un mensaje…",
  className,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  placeholder?: string;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useDraftState(`linki:chat:${conversationId}`, "");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages(initialMessages), [initialMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Marcar como leídos los mensajes recibidos
  useEffect(() => {
    const unread = messages.some((m) => m.sender_id !== currentUserId && !m.read_at);
    if (!unread) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .is("read_at", null)
      .then(() => {});
  }, [messages, conversationId, currentUserId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: body.slice(0, 2000) })
      .select()
      .single<Message>();
    setSending(false);
    if (err) return setError("No se pudo enviar el mensaje");
    setText("");
    setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
  }

  let lastDay = "";
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Aún no hay mensajes. ¡Escribe el primero!</p>}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const d = day(m.created_at);
          const showDay = d !== lastDay;
          lastDay = d;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] font-medium uppercase text-slate-400">{d}</p>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    mine ? "rounded-br-md bg-brand text-on-brand" : "rounded-bl-md bg-white text-slate-800",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 text-right text-[10px]", mine ? "opacity-75" : "text-slate-400")}>{time(m.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-3 text-xs text-rose-600">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 bg-white p-2">
        <input className="input" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="btn-primary px-3" disabled={sending || !text.trim()} aria-label="Enviar">
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </div>
  );
}
