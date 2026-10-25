import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { getSession } from "@/lib/auth";
import { getStoreBySlug } from "@/lib/storefront";
import type { Message } from "@/lib/types";
import { initials } from "@/lib/utils";
import { LoginPrompt } from "../login-prompt";

export const metadata = { title: "Mensajes" };

export default async function CustomerMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const { supabase, user } = await getSession();
  if (!user) return <LoginPrompt slug={store.slug} next={`/${store.slug}/mensajes`} text={`Inicia sesión para escribirle a ${store.name}.`} />;

  if (user.id === store.owner_id) {
    return <p className="px-4 py-10 text-center text-slate-600">Eres el dueño de esta tienda: responde a tus clientes desde tu panel.</p>;
  }

  const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", { p_store: store.id });
  if (error || !conversationId) return <p className="px-4 py-10 text-center text-rose-600">No se pudo abrir el chat.</p>;

  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId as string)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-[calc(100dvh-3.5rem-6rem)] flex-col bg-slate-100">
      <div className="flex items-center gap-3 border-b bg-white px-4 py-2.5">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo_url} alt="" className="size-9 rounded-full object-contain" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{initials(store.name)}</span>
        )}
        <div>
          <p className="font-brand font-semibold leading-tight">{store.name}</p>
          <p className="text-xs text-slate-500">Normalmente responde en el día</p>
        </div>
      </div>
      <Chat
        className="min-h-0 flex-1"
        conversationId={conversationId as string}
        currentUserId={user.id}
        initialMessages={(data ?? []) as Message[]}
        placeholder={`Escríbele a ${store.name}…`}
      />
    </div>
  );
}
