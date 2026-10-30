"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";

/** Marca como leídas las notificaciones del usuario (al abrir la campana) */
export async function markNotificationsRead() {
  const { supabase, user } = await getSession();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/panel", "layout");
}
