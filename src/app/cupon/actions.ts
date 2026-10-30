"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth-actions";
import { getSession } from "@/lib/auth";
import { isDuplicateEmailError, parseRegistration, registrationMetadata } from "@/lib/registration";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const code = (fd: FormData) => String(fd.get("coupon") ?? "").trim().slice(0, 40);

/** Canjea el cupón para la tienda de la sesión actual y entra al panel */
async function redeemAndGo(coupon: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_coupon", { p_code: coupon });
  if (error) return { error: error.message };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("onboarding_completed").eq("owner_id", user!.id).single();
  revalidatePath("/", "layout");
  redirect(store?.onboarding_completed ? "/panel" : "/onboarding");
}

async function couponIsValid(coupon: string) {
  if (!coupon) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("coupon_is_valid", { p_code: coupon });
  return data === true;
}

/** Ya con sesión de tienda (p. ej. desde el aviso de acceso vencido) */
export async function redeemCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const { profile } = await getSession();
  if (profile?.role !== "store_owner") return { error: "Inicia sesión con tu tienda" };
  return redeemAndGo(code(fd));
}

/** Iniciar sesión con una cuenta que ya existe + el cupón */
export async function loginWithCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const coupon = code(fd);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!coupon) return { error: "Escribe tu cupón" };
  if (!email || !password) return { error: "Ingresa tu email y contraseña" };
  if (!(await couponIsValid(coupon))) return { error: "Cupón inválido o vencido" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "user_banned") return { error: "Tu pago aún está en revisión. Podrás iniciar sesión apenas lo aprobemos." };
  if (error || !data.user) return { error: "Email o contraseña incorrectos" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role !== "store_owner") {
    await supabase.auth.signOut();
    return { error: "Los cupones son para cuentas de empresa" };
  }
  return redeemAndGo(coupon);
}

/** Crear la cuenta de empresa con el cupón (sin cupón válido no se crea nada) */
export async function registerWithCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const coupon = code(fd);
  if (!coupon) return { error: "Escribe tu cupón" };
  if (!(await couponIsValid(coupon))) return { error: "Cupón inválido o vencido" };
  const parsed = parseRegistration(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { email, password } = parsed.data;

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: registrationMetadata(parsed.data),
  });
  if (createError) {
    return {
      error: isDuplicateEmailError(createError.message)
        ? "Ese email ya está registrado. Usa «Ya tengo cuenta»."
        : "No se pudo crear la cuenta: " + createError.message,
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Cuenta creada, pero no se pudo iniciar sesión. Intenta desde Iniciar sesión." };
  return redeemAndGo(coupon);
}
