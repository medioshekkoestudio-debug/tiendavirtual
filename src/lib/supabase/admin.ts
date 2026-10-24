import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: salta RLS. Úsalo SOLO en código de servidor
 * (server actions / route handlers) y siempre después de validar permisos.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
