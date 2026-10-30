import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/** Cliente con service role: salta RLS. Nunca sale de este servicio. */
export const db = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type PaymentKind = "suscripcion" | "comision";

export const PAYMENT_TABLE: Record<PaymentKind, string> = {
  suscripcion: "subscription_payments",
  comision: "commission_payments",
};

export type PendingPayment = {
  kind: PaymentKind;
  id: string;
  store_id: string;
  amount_usd: number;
  method: string;
  reference: string;
  receipt_path: string | null;
  created_at: string;
};
