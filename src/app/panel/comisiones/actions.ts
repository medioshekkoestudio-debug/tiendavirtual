"use server";

import { revalidatePath } from "next/cache";
import { getOwnerStore } from "@/lib/auth";
import { PAYMENT_METHODS, PLAN_PAYMENT_METHOD_KEYS } from "@/lib/constants";
import type { PaymentMethodConfig, PlanPaymentMethodKey } from "@/lib/types";

/**
 * Registra el pago de comisiones con su comprobante. orderIds null = todas las que tiene por pagar.
 * El monto lo calcula la base de datos; queda pendiente hasta que el Superadmin lo apruebe.
 */
export async function createCommissionPayment(input: {
  orderIds: string[] | null;
  method: PlanPaymentMethodKey;
  reference: string;
  receipt_path: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await getOwnerStore();
  if (!PLAN_PAYMENT_METHOD_KEYS.includes(input.method)) return { error: "Elige un método de pago" };
  const ids = input.orderIds === null ? null : [...new Set((input.orderIds ?? []).map(String))].slice(0, 1000);
  if (ids && !ids.length) return { error: "Elige al menos una comisión" };

  const { data: settings } = await supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle();
  const methods = (settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  if (!methods[input.method]?.enabled) return { error: `${PAYMENT_METHODS[input.method].label} no está disponible en este momento` };

  const reference = String(input.reference ?? "").trim().slice(0, 100);
  if (!reference) return { error: "Escribe el número de referencia o ID de la transacción" };
  const receipt = String(input.receipt_path ?? "");
  if (!receipt.startsWith(`${user.id}/`)) return { error: "Adjunta el comprobante del pago" };

  const { error } = await supabase.rpc("create_commission_payment", {
    p_orders: ids,
    p_method: input.method,
    p_reference: reference,
    p_receipt: receipt,
  });
  if (error) return { error: error.message };
  revalidatePath("/panel", "layout");
  revalidatePath("/superadmin/comisiones");
  return { ok: true };
}
