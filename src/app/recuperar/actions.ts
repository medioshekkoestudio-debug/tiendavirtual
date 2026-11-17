"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, isBot, TOO_MANY } from "@/lib/guard";

// Recuperar la contraseña sin correo, igual que en La Mejor Llave: la persona demuestra que es la dueña
// con su email, su cédula y su teléfono (los del registro) y pone la contraseña nueva en la misma pantalla.
//
// Reglas:
//  - Todo fallo de identidad responde lo MISMO (no se dice si el correo existe ni qué dato falló).
//  - Límite de intentos por correo y por IP.
//  - Las cuentas de Superadmin no se recuperan por aquí.
//  - El permiso del paso 2 es un token firmado que vence a los 10 minutos y deja de valer en cuanto la
//    contraseña cambia (va atado al updated_at de la cuenta), así que sirve una sola vez.

const NO_CUADRA =
  "Esos datos no coinciden con ninguna cuenta. Revisa que el email, la cédula y el teléfono sean los que registraste. Si no lo logras, escríbenos y te ayudamos.";
const MINUTOS_PERMISO = 10;
const CLAVE_MINIMA = 8;

export type RecoverState = { error?: string; token?: string; name?: string } | undefined;

const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
/** «V-12.345.678» → «V12345678» */
const cleanCedula = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
/** «+58 414-123 4567», «414 1234567» o «0414-1234567» → «04141234567» */
function cleanPhone(v: unknown) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("58")) d = "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("4")) d = "0" + d;
  return d;
}

async function allow(key: string, max: number) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: 3600 });
  return error ? true : data === true;
}

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update("recuperar:" + payload).digest("base64url");
}
function makeToken(userId: string, updatedAt: string) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + MINUTOS_PERMISO * 60_000, v: updatedAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function readToken(token: string): { u: string; e: number; v: string } | null {
  const [payload, sig] = String(token ?? "").split(".");
  if (!payload || !sig || !secret()) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data?.u === "string" && typeof data?.e === "number" && data.e > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/** Un solo estado para los dos pasos: con token es el paso 2 */
export async function recover(_: RecoverState, fd: FormData): Promise<RecoverState> {
  return fd.get("token") ? resetPassword(fd) : verifyIdentity(fd);
}

/** Paso 1: «¿eres tú?» */
async function verifyIdentity(fd: FormData): Promise<RecoverState> {
  const email = cleanEmail(fd.get("email"));
  const cedula = cleanCedula(fd.get("cedula"));
  const phone = cleanPhone(fd.get("phone"));
  if (!email || cedula.length < 7 || phone.length < 10) return { error: "Escribe tu email, tu cédula y tu teléfono para continuar." };
  if (isBot(fd)) return { error: NO_CUADRA };
  const ip = await clientIp();
  if (!(await allow(`recuperar:${email}`, 5)) || !(await allow(`recuperar-ip:${ip}`, 10))) {
    return { error: "Demasiados intentos. Espera una hora y vuelve a probar, o escríbenos y te ayudamos." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, cedula, phone")
    .eq("email", email)
    .maybeSingle();
  if (!profile || profile.role === "superadmin") return { error: NO_CUADRA };
  if (!profile.cedula || !profile.phone) return { error: NO_CUADRA };
  if (cleanCedula(profile.cedula) !== cedula || cleanPhone(profile.phone) !== phone) return { error: NO_CUADRA };

  const { data: auth } = await admin.auth.admin.getUserById(profile.id);
  if (!auth?.user || cleanEmail(auth.user.email) !== email) return { error: NO_CUADRA };

  return { token: makeToken(auth.user.id, auth.user.updated_at ?? ""), name: profile.full_name?.split(" ")[0] ?? "" };
}

/** Paso 2: la contraseña nueva, y entra al momento */
async function resetPassword(fd: FormData): Promise<RecoverState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const keep = { token, name: String(fd.get("name") ?? "") };
  if (password.length < CLAVE_MINIMA) return { ...keep, error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  if (String(fd.get("password_confirm") ?? "") !== password) return { ...keep, error: "Las dos contraseñas no son iguales." };

  const data = readToken(token);
  const expired = { error: "Pasaron más de 10 minutos o este paso ya se usó. Vuelve a escribir tus datos." };
  if (!data) return expired;
  const admin = createAdminClient();
  const { data: auth } = await admin.auth.admin.getUserById(data.u);
  // Si la contraseña ya cambió desde que se dio el permiso, updated_at es otro y el permiso no vale
  if (!auth?.user || (auth.user.updated_at ?? "") !== data.v) return expired;

  const { error } = await admin.auth.admin.updateUserById(data.u, { password });
  if (error) return { ...keep, error: /password/i.test(error.message) ? "Esa contraseña no es válida. Prueba con otra." : "No se pudo cambiar la contraseña. Intenta de nuevo." };

  const supabase = await createClient();
  const { data: signed, error: loginError } = await supabase.auth.signInWithPassword({ email: auth.user.email ?? "", password });
  if (loginError?.code === "user_banned") return { error: "Contraseña cambiada. Tu pago aún está en revisión: podrás entrar apenas lo aprobemos." };
  if (loginError || !signed.user) return { error: "Contraseña cambiada. Vuelve al inicio de sesión y entra con ella." };

  revalidatePath("/", "layout");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", signed.user.id).single();
  if (profile?.role === "store_owner") {
    await supabase.rpc("log_my_activity", { p_action: "inicio_sesion" });
    const { data: store } = await supabase.from("stores").select("onboarding_completed").eq("owner_id", signed.user.id).single();
    redirect(store?.onboarding_completed ? "/panel" : "/onboarding");
  }
  redirect("/");
}
