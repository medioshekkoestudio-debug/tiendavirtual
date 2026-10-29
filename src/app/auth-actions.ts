"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRubro } from "@/lib/constants";
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
  const fullName = str(fd, "full_name");
  const company = str(fd, "company_name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const industry = str(fd, "industry");
  const cedula = str(fd, "cedula").toUpperCase().replace(/\s+/g, "").slice(0, 20);
  const phone = str(fd, "phone").slice(0, 30);

  if (!fullName || !company || !email || !cedula || !phone) return { error: "Completa todos los campos" };
  if (company.length < 3) return { error: "El nombre de la empresa debe tener al menos 3 caracteres" };
  if (!isRubro(industry)) return { error: "Elige el rubro de tu empresa" };
  if (!/^[VEJGP]-?\d{6,9}(-?\d)?$/.test(cedula)) return { error: "Cédula o RIF inválido. Ejemplo: V-12345678 o J-12345678-9" };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Teléfono inválido. Ejemplo: 0414-1234567" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email inválido" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "store_owner", full_name: fullName, company_name: company, industry, cedula, phone },
  });
  if (createError) {
    return {
      error: /already|registered|exists/i.test(createError.message)
        ? "Ese email ya está registrado. Inicia sesión."
        : "No se pudo crear la cuenta: " + createError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Cuenta creada, pero no se pudo iniciar sesión. Intenta desde Iniciar sesión." };
  redirect("/onboarding");
}

export async function signOut(fd: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(safeNext(str(fd, "next")) || "/");
}
