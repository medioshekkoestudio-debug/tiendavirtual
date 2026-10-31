"use server";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { allowAttempt, isBot, TOO_MANY } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message } from "@/lib/types";

// Chat de invitados: la clave secreta vive solo en una cookie httpOnly del navegador; en la base se guarda su hash.
// Todo pasa por aquí con la llave de servicio, porque el invitado no tiene sesión para las reglas de acceso.

const cookieName = (storeId: string) => `linki_chat_${storeId.replace(/-/g, "")}`;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const isUuid = (v: string) => /^[0-9a-f-]{36}$/.test(v);

async function guestConversation(storeId: string) {
  if (!isUuid(storeId)) return null;
  const token = (await cookies()).get(cookieName(storeId))?.value;
  if (!token) return null;
  const { data } = await createAdminClient()
    .from("conversations")
    .select("id")
    .eq("store_id", storeId)
    .eq("guest_token_hash", hash(token))
    .maybeSingle();
  return data?.id ?? null;
}

/** Mensajes del invitado en esta tienda (null si aún no ha escrito). Marca como leídas las respuestas de la tienda. */
export async function getGuestMessages(storeId: string): Promise<Message[] | null> {
  const conversationId = await guestConversation(storeId);
  if (!conversationId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(500);
  const list = (data ?? []) as Message[];
  if (list.some((m) => m.sender_id && !m.read_at)) {
    await admin.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversationId).not("sender_id", "is", null).is("read_at", null);
  }
  return list;
}

/** Primer mensaje del invitado: crea la conversación con su nombre y deja la clave en su navegador. */
export async function startGuestChat(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const storeId = String(fd.get("store_id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const phone = String(fd.get("phone") ?? "").trim().slice(0, 30);
  const body = String(fd.get("body") ?? "").trim().slice(0, 2000);
  if (isBot(fd) || !isUuid(storeId)) return { error: "No se pudo enviar el mensaje" };
  if (name.length < 2) return { error: "Escribe tu nombre" };
  if (!body) return { error: "Escribe tu mensaje" };
  if (await guestConversation(storeId)) return sendGuestMessage(storeId, body);
  if (!(await allowAttempt("chat_invitado", 5, 3600))) return { error: TOO_MANY };

  const admin = createAdminClient();
  const { data: store } = await admin.from("stores").select("id").eq("id", storeId).eq("is_active", true).maybeSingle();
  if (!store) return { error: "Esta tienda no está disponible" };

  const token = randomBytes(32).toString("base64url");
  const { data: conv, error } = await admin
    .from("conversations")
    .insert({ store_id: storeId, customer_name: name, guest_phone: phone || null, guest_token_hash: hash(token) })
    .select("id")
    .single();
  if (error || !conv) return { error: "No se pudo abrir el chat" };
  const { error: msgError } = await admin.from("messages").insert({ conversation_id: conv.id, sender_id: null, body });
  if (msgError) return { error: "No se pudo enviar el mensaje" };

  (await cookies()).set(cookieName(storeId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true };
}

/** Siguientes mensajes del invitado */
export async function sendGuestMessage(storeId: string, raw: string): Promise<{ error?: string; ok?: boolean }> {
  const body = String(raw ?? "").trim().slice(0, 2000);
  if (!body) return { error: "Escribe tu mensaje" };
  const conversationId = await guestConversation(storeId);
  if (!conversationId) return { error: "Tu chat expiró. Recarga la página para empezar de nuevo." };
  if (!(await allowAttempt("chat_invitado_mensaje", 60, 3600))) return { error: TOO_MANY };
  const { error } = await createAdminClient().from("messages").insert({ conversation_id: conversationId, sender_id: null, body });
  return error ? { error: "No se pudo enviar el mensaje" } : { ok: true };
}
