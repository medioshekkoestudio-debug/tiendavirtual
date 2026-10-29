"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDuplicateEmailError, parseRegistration, registrationMetadata } from "@/lib/registration";
import type { Profile } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean } | undefined;

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "";
}

/** Login para dueños de tienda y superadmin (y clientes desde /login). */
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  if (!email || !password) return { error: "Ingresa tu email y contraseña" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Las cuentas creadas al pagar un plan quedan bloqueadas hasta que el Superadmin aprueba el pago
  if (error?.code === "user_banned") return { error: "Tu pago aún está en revisión. Podrás iniciar sesión apenas lo aprobemos." };
  if (error || !data.user) return { error: "Email o contraseña incorrectos" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single<Pick<Profile, "role">>();
  revalidatePath("/", "layout");
  if (next) redirect(next);
  if (profile?.role === "superadmin") redirect("/superadmin");
  if (profile?.role === "store_owner") {
    const { data: store } = await supabase.from("stores").select("onboarding_completed").eq("owner_id", data.user.id).single();
    redirect(store?.onboarding_completed ? "/panel" : "/onboarding");
  }
  redirect("/");
}

/** Registro de una empresa: crea usuario + tienda (trigger) con su link linkiapp.com/<slug>. */
export async function registerStore(_: FormState, fd: FormData): Promise<FormState> {
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
        ? "Ese email ya está registrado. Inicia sesión."
        : "No se pudo crear la cuenta: " + createError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Cuenta creada, pero no se pudo iniciar sesión. Intenta desde Iniciar sesión." };
  // Si venía de elegir un plan en la landing, sigue a la pasarela de pago; si no, al asistente
  redirect(safeNext(str(fd, "next")) || "/onboarding");
}

export async function signOut(fd: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(safeNext(str(fd, "next")) || "/");
}
