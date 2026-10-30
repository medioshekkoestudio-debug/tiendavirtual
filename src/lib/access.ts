import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./types";

/**
 * Nada es gratis: la tienda puede usar la app mientras tenga un plan aprobado vigente
 * o un cupón vigente (trial_ends_at). Si no, la app le pide comprar un plan.
 */
export function accessUntil(store: Pick<Store, "plan" | "plan_expires_at" | "trial_ends_at">) {
  const dates = [store.plan ? store.plan_expires_at : null, store.trial_ends_at]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime());
  return dates.length ? Math.max(...dates) : 0;
}

export function hasAccess(store: Pick<Store, "plan" | "plan_expires_at" | "trial_ends_at">, now = Date.now()) {
  return accessUntil(store) > now;
}

/** Mientras su pago de plan está en revisión puede entrar y usar la app; se le avisa que falta la aprobación */
export async function hasPendingPlanPayment(supabase: SupabaseClient, storeId: string) {
  const { count } = await supabase
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "pendiente");
  return (count ?? 0) > 0;
}
