"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_PAYMENT_METHOD_KEYS } from "@/lib/constants";
import { cleanMethodConfig } from "@/lib/payment-details";
import type { LandingContent, PaymentMethodConfig, PlanPaymentMethodKey } from "@/lib/types";

async function requireSuperadmin() {
  const { supabase, profile } = await getSession();
  if (profile?.role !== "superadmin") redirect("/login");
  return supabase;
}

export async function saveLanding(content: LandingContent): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await requireSuperadmin();
  const clean: LandingContent = {
    brand_name: content.brand_name.trim().slice(0, 40) || "Linki App",
    hero_title: content.hero_title.trim().slice(0, 140),
    hero_subtitle: content.hero_subtitle.trim().slice(0, 300),
    hero_image: /^https?:\/\//.test(content.hero_image) ? content.hero_image.slice(0, 1000) : "",
    description_title: content.description_title.trim().slice(0, 120),
    description: content.description.trim().slice(0, 2000),
    cta_text: content.cta_text.trim().slice(0, 60) || "Crear mi tienda",
    features: content.features.slice(0, 6).map((f) => ({ title: f.title.trim().slice(0, 80), text: f.text.trim().slice(0, 300) })),
    footer_text: content.footer_text.trim().slice(0, 200),
  };
  const { error } = await supabase
    .from("landing_content")
    .update({ content: clean, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** Datos de cobro de Linki App (Pago móvil, PayPal, Binance) que ven las tiendas al pagar su plan. */
export async function savePlatformPaymentMethods(
  input: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await requireSuperadmin();
  const clean: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>> = {};
  for (const key of PLAN_PAYMENT_METHOD_KEYS) {
    const src = input[key];
    if (!src) continue;
    clean[key] = cleanMethodConfig(src);
  }
  const { error } = await supabase
    .from("platform_settings")
    .update({ payment_methods: clean, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/superadmin/planes");
  revalidatePath("/suscripcion");
  return { ok: true };
}

/**
 * Aprobar activa (o extiende) el plan de la tienda, ajusta su comisión y desbloquea la cuenta
 * si se creó en la pasarela. Rechazar solo marca el pago (la cuenta nueva sigue bloqueada).
 */
export async function reviewSubscriptionPayment(id: string, approve: boolean): Promise<{ error?: string }> {
  const supabase = await requireSuperadmin();
  const { error } = await supabase.rpc("review_subscription_payment", { p_id: id, p_approve: approve });
  if (error) return { error: error.message };
  if (approve) {
    const admin = createAdminClient();
    const { data } = await admin.from("subscription_payments").select("stores(owner_id)").eq("id", id).single<{ stores: { owner_id: string } | null }>();
    if (data?.stores) {
      const { error: unbanError } = await admin.auth.admin.updateUserById(data.stores.owner_id, { ban_duration: "none" });
      if (unbanError) return { error: "Pago aprobado, pero no se pudo activar la cuenta: " + unbanError.message };
    }
  }
  revalidatePath("/superadmin/planes");
  revalidatePath("/superadmin");
  return {};
}

/** Aprobar o rechazar un pago de comisiones. Al rechazarlo, sus comisiones vuelven a «por pagar». */
export async function reviewCommissionPayment(id: string, approve: boolean): Promise<{ error?: string }> {
  const supabase = await requireSuperadmin();
  const { error } = await supabase.rpc("review_commission_payment", { p_id: id, p_approve: approve });
  if (error) return { error: error.message };
  revalidatePath("/superadmin/comisiones");
  return {};
}

export async function setStoreActive(storeId: string, active: boolean): Promise<{ error?: string }> {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("stores").update({ is_active: active }).eq("id", storeId).select("slug").single();
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  revalidatePath(`/${data.slug}`, "layout");
  return {};
}

// ------------------------------------------------------------------ Cupones
const COUPON_RE = /^[A-Za-z0-9_-]{3,40}$/;

/** Crea (sin id) o edita un cupón: código, días de acceso y si está activo. Los días nuevos no cambian a quien ya lo canjeó. */
export async function saveCoupon(input: { id?: string; code: string; free_days: number; active: boolean }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await requireSuperadmin();
  const code = String(input.code ?? "").trim();
  const days = Math.trunc(Number(input.free_days));
  if (!COUPON_RE.test(code)) return { error: "El código debe tener de 3 a 40 letras, números, guiones o _ (sin espacios)" };
  if (!Number.isFinite(days) || days < 1 || days > 3650) return { error: "Los días deben ser entre 1 y 3650" };
  const row = { code, free_days: days, active: Boolean(input.active), updated_at: new Date().toISOString() };
  const { error } = input.id
    ? await supabase.from("coupons").update(row).eq("id", input.id)
    : await supabase.from("coupons").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe un cupón con ese código" : error.message };
  revalidatePath("/superadmin/cupones");
  return { ok: true };
}
