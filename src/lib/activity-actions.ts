"use server";

import { createClient } from "./supabase/server";

/** Pantalla que abrió el dueño en su panel (la base ignora a quien no tiene tienda) */
export async function logVisit(path: string) {
  const supabase = await createClient();
  await supabase.rpc("log_my_activity", { p_action: "visita", p_detail: { path: String(path).slice(0, 120) } });
}
