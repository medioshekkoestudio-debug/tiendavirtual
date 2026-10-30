import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

// Defensas contra bots en lo que crea cuentas o prueba contraseñas y cupones:
//  - límite de intentos por IP guardado en la base (sirve aunque Vercel use varias instancias);
//  - campo trampa invisible (Honeypot): una persona no lo ve ni lo llena, un bot sí.

export const TOO_MANY = "Demasiados intentos. Espera unos minutos e intenta de nuevo.";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "sin-ip";
}

/** true si todavía se permite. Si la base falla, deja pasar (no se bloquea a la gente por un error nuestro) */
export async function allowAttempt(action: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${action}:${await clientIp()}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  return error ? true : data === true;
}

/** El campo trampa vino lleno: es un bot */
export function isBot(fd: FormData) {
  return String(fd.get("sitio_web") ?? "") !== "";
}

/** app_metadata que exige la base para crear una cuenta (solo la puede poner el servidor) */
export function accountOrigin(role: "store_owner" | "customer") {
  return { origen: "linki", role };
}
