import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Chat } from "@/components/chat";
import { getOwnerStore } from "@/lib/auth";
import type { Conversation, Message } from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

export const metadata = { title: "Mensajes" };

export default async function PanelMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { supabase, user, store } = await getOwnerStore();
  const { c } = await searchParams;

  const { data: convData } = await supabase
    .from("conversations")
    .select("*")
    .eq("store_id", store.id)
    .order("last_message_at", { ascending: false });
  const conversations = (convData ?? []) as Conversation[];
  const ids = conversations.map((x) => x.id);

  const { data: msgData } = ids.length
    ? await supabase.from("messages").select("*").in("conversation_id", ids).order("created_at", { ascending: true })
    : { data: [] };
  const messages = (msgData ?? []) as Message[];
  const byConv = new Map<string, Message[]>();
  for (const m of messages) byConv.set(m.conversation_id, [...(byConv.get(m.conversation_id) ?? []), m]);

  const active = conversations.find((x) => x.id === c);

  if (active) {
    return (
      <div className="-mx-4 -my-5 flex h-[calc(100dvh-8.5rem)] flex-col bg-slate-100">
        <div className="flex items-center gap-3 border-b bg-white px-4 py-2.5">
          <Link href="/panel/mensajes" className="rounded-lg p-1 hover:bg-slate-100" aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Link>
          <span className="grid size-9 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">{initials(active.customer_name)}</span>
          <p className="font-semibold">{active.customer_name ?? "Cliente"}</p>
        </div>
        <Chat
          className="min-h-0 flex-1"
          conversationId={active.id}
          currentUserId={user.id}
          initialMessages={byConv.get(active.id) ?? []}
          placeholder="Responde a tu cliente…"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mensajes</h1>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {conversations.map((conv) => {
          const list = byConv.get(conv.id) ?? [];
          const last = list[list.length - 1];
          const unread = list.filter((m) => m.sender_id !== user.id && !m.read_at).length;
          return (
            <li key={conv.id}>
              <Link href={`/panel/mensajes?c=${conv.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/15 font-bold text-brand">{initials(conv.customer_name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate", unread ? "font-bold" : "font-semibold")}>{conv.customer_name ?? "Cliente"}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatDate(conv.last_message_at)}</span>
                  </div>
                  <p className={cn("truncate text-sm", unread ? "text-slate-900" : "text-slate-500")}>
                    {last ? (last.sender_id === user.id ? "Tú: " : "") + last.body : "Sin mensajes"}
                  </p>
                </div>
                {unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-on-brand">{unread}</span>}
              </Link>
            </li>
          );
        })}
        {!conversations.length && (
          <li className="px-4 py-10 text-center text-sm text-slate-500">
            Cuando un cliente te escriba desde tu tienda, verás la conversación aquí.
          </li>
        )}
      </ul>
    </div>
  );
}
