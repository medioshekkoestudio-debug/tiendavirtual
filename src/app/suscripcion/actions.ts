"use server";

import { accountOrigin, allowAttempt, isBot, TOO_MANY } from "@/lib/guard";
import { revalidatePath } from "next/cache";
import { getOwnerStore } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDuplicateEmailError, parseRegistration, registrationMetadata } from "@/lib/registration";
import { adminLink, notifyAdmin, signupLines } from "@/lib/admin-whatsapp";
import { PAYMENT_METHODS, PLANS, PLAN_PAYMENT_METHOD_KEYS, isPlan, isPlanCycle, planPrice } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { cleanReference, referenceError } from "@/lib/payment-reference";
import type { PaymentMethodConfig, PlanCycle, PlanKey, PlanPaymentMethodKey } from "@/lib/types";

/** Registra el pago de un plan con su comprobante. Queda pendiente hasta que el Superadmin lo apruebe. */
export async function createSubscriptionPayment(input: {
  plan: PlanKey;
  cycle: PlanCycle;
  method: PlanPaymentMethodKey;
  reference: string;
  receipt_path: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user, store } = await getOwnerStore(true);
  if (!isPlan(input.plan) || !isPlanCycle(input.cycle)) return { error: "Elige un plan" };
  if (!PLAN_PAYMENT_METHOD_KEYS.includes(input.method)) return { error: "Elige un método de pago" };

  const { data: settings } = await supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle();
  const methods = (settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  if (!methods[input.method]?.enabled) return { error: `${PAYMENT_METHODS[input.method].label} no está disponible en este momento` };

  const refError = referenceError(input.method, input.reference);
  if (refError) return { error: refError };
  const reference = cleanReference(input.method, input.reference);
  const receipt = String(input.receipt_path ?? "");
  if (!receipt.startsWith(`${user.id}/`)) return { error: "Adjunta el comprobante del pago" };

  const { data: pending } = await supabase
    .from("subscription_payments")
    .select("id")
    .eq("store_id", store.id)
    .eq("status", "pendiente")
    .limit(1);
  if (pending?.length) return { error: "Ya tienes un pago en revisión. Te avisaremos cuando lo verifiquemos." };

  const { error } = await supabase.from("subscription_payments").insert({
    store_id: store.id,
    plan: input.plan,
    cycle: input.cycle,
    method: input.method,
    reference,
    receipt_path: receipt,
  });
  if (error) return { error: "No se pudo registrar el pago: " + error.message };
  notifyAdmin([
    "💰 *Pago de plan por aprobar*",
    `Tienda: ${store.name}`,
    `Plan: ${PLANS[input.plan].label} ${input.cycle} · ${formatMoney(planPrice(input.plan, input.cycle))}`,
    `Método: ${PAYMENT_METHODS[input.method].label} · Ref. ${reference}`,
    adminLink("/superadmin/planes"),
  ]);
  revalidatePath("/suscripcion");
  revalidatePath("/superadmin/planes");
  return { ok: true };
}

const RECEIPT_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "pdf"];
const NEW_RECEIPT_RE = /^nuevos\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic|pdf)$/;

/** Quien aún no tiene cuenta sube el comprobante con un enlace firmado (el bucket es privado). */
export async function getNewReceiptUploadUrl(ext: string): Promise<{ error?: string; path?: string; token?: string }> {
  const clean = String(ext ?? "").toLowerCase();
  if (!RECEIPT_EXTS.includes(clean)) return { error: "El comprobante debe ser una imagen o un PDF" };
  if (!(await allowAttempt("comprobante", 10, 3600))) return { error: TOO_MANY };
  const path = `nuevos/${crypto.randomUUID()}.${clean}`;
  const { data, error } = await createAdminClient().storage.from("payment-receipts").createSignedUploadUrl(path);
  if (error || !data) return { error: "No se pudo preparar la subida del comprobante" };
  return { path: data.path, token: data.token };
}

/**
 * Pasarela para quien aún no tiene tienda: crea la cuenta y la tienda con los datos de registro y
 * registra el pago. La cuenta queda bloqueada hasta que el Superadmin apruebe el pago.
 */
export async function createPlanSignup(fd: FormData): Promise<{ error?: string; step?: "registro"; ok?: boolean }> {
  if (isBot(fd)) return { error: "No se pudo crear la cuenta", step: "registro" };
  const parsed = parseRegistration(fd);
  if ("error" in parsed) return { error: parsed.error, step: "registro" };
  if (!(await allowAttempt("registro", 5, 3600))) return { error: TOO_MANY, step: "registro" };

  const plan = String(fd.get("plan") ?? "");
  const cycle = String(fd.get("cycle") ?? "");
  const method = String(fd.get("method") ?? "") as PlanPaymentMethodKey;
  const reference = cleanReference(method, fd.get("reference"));
  const receipt = String(fd.get("receipt_path") ?? "");
  if (!isPlan(plan) || !isPlanCycle(cycle)) return { error: "Elige un plan" };
  if (!PLAN_PAYMENT_METHOD_KEYS.includes(method)) return { error: "Elige un método de pago" };
  const refError = referenceError(method, fd.get("reference"));
  if (refError) return { error: refError };
  if (!NEW_RECEIPT_RE.test(receipt)) return { error: "Adjunta el comprobante del pago" };

  const admin = createAdminClient();
  const { data: settings } = await admin.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle();
  const methods = (settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  if (!methods[method]?.enabled) return { error: `${PAYMENT_METHODS[method].label} no está disponible en este momento` };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: registrationMetadata(parsed.data),
    app_metadata: accountOrigin("store_owner"),
  });
  if (createError || !created.user) {
    return createError && isDuplicateEmailError(createError.message)
      ? { error: "Ese email ya tiene una tienda. Inicia sesión para pagar tu plan.", step: "registro" }
      : { error: "No se pudo crear la cuenta: " + (createError?.message ?? "intenta de nuevo"), step: "registro" };
  }

  // La tienda la crea el trigger handle_new_user al crear el usuario
  const userId = created.user.id;
  const { data: store } = await admin.from("stores").select("id").eq("owner_id", userId).maybeSingle();
  const { error } = store
    ? await admin.from("subscription_payments").insert({ store_id: store.id, plan, cycle, method, reference, receipt_path: receipt })
    : { error: { message: "no se creó la tienda" } };
  if (error) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "No se pudo registrar el pago: " + error.message };
  }
  notifyAdmin([
    ...signupLines(parsed.data, `pasarela de planes`),
    "",
    "💰 *Pago de plan por aprobar*",
    `Plan: ${PLANS[plan].label} ${cycle} · ${formatMoney(planPrice(plan, cycle))}`,
    `Método: ${PAYMENT_METHODS[method].label} · Ref. ${reference}`,
    adminLink("/superadmin/planes"),
  ]);
  revalidatePath("/superadmin/planes");
  return { ok: true };
}
