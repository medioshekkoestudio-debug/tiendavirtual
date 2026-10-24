"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethodKey } from "@/lib/types";

export type CheckoutInput = {
  storeId: string;
  slug: string;
  items: { product_id: string; quantity: number }[];
  customer: { name: string; cedula: string; phone: string; email: string; notes: string };
  delivery: { type: "envio" | "retiro"; address: string; scheduled_for: string | null };
  payment: { method: PaymentMethodKey; reference: string };
  account?: { email: string; password: string } | null;
};

export type CheckoutResult = { error?: string; orderNumber?: number; accountCreated?: boolean };

async function createCustomerAccount(email: string, password: string, meta: { full_name: string; phone?: string; cedula?: string }) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "customer", ...meta },
  });
  if (error) {
    return /already|registered|exists/i.test(error.message)
      ? "Ese email ya tiene una cuenta. Inicia sesión arriba o desmarca “Crear mi cuenta”."
      : "No se pudo crear la cuenta: " + error.message;
  }
  return null;
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accountCreated = false;
  if (!user && input.account) {
    const email = input.account.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email inválido" };
    if (input.account.password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
    const err = await createCustomerAccount(email, input.account.password, {
      full_name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      cedula: input.customer.cedula.trim(),
    });
    if (err) return { error: err };
    const { error } = await supabase.auth.signInWithPassword({ email, password: input.account.password });
    if (error) return { error: "Cuenta creada, pero no se pudo iniciar sesión" };
    input.customer.email ||= email;
    accountCreated = true;
  }

  const { data, error } = await supabase.rpc("place_order", {
    p_store: input.storeId,
    p_items: input.items.map((i) => ({ product_id: i.product_id, quantity: Math.trunc(i.quantity) })),
    p_customer: input.customer,
    p_delivery: input.delivery,
    p_payment: input.payment,
  });
  if (error) return { error: error.message, accountCreated };

  const row = (Array.isArray(data) ? data[0] : data) as { order_number: number } | undefined;
  revalidatePath(`/${input.slug}`, "layout");
  return { orderNumber: row?.order_number, accountCreated };
}

export type AuthState = { error?: string } | undefined;

function target(slug: string, next: string) {
  return next.startsWith(`/${slug}`) ? next : `/${slug}/compras`;
}

export async function customerLogin(_: AuthState, fd: FormData): Promise<AuthState> {
  const slug = String(fd.get("slug") ?? "");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos" };
  revalidatePath(`/${slug}`, "layout");
  redirect(target(slug, String(fd.get("next") ?? "")));
}

export async function customerRegister(_: AuthState, fd: FormData): Promise<AuthState> {
  const slug = String(fd.get("slug") ?? "");
  const name = String(fd.get("full_name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "Escribe tu nombre" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email inválido" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const err = await createCustomerAccount(email, password, { full_name: name, phone: String(fd.get("phone") ?? "").trim() });
  if (err) return { error: err };
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  revalidatePath(`/${slug}`, "layout");
  redirect(target(slug, String(fd.get("next") ?? "")));
}
