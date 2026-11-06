import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/utils";

/** Nombre corto del dispositivo a partir del user-agent (solo para mostrar) */
function device(ua: string | null) {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "Otro";
  const browser = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return browser ? `${os} · ${browser}` : os;
}

/** Registro de los clientes que confirmaron ser mayores de edad para entrar a la tienda (últimos 50) */
export async function AgeConfirmations({ supabase, storeId, active }: { supabase: SupabaseClient; storeId: string; active: boolean }) {
  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from("store_age_confirmations")
      .select("id, name, email, user_agent, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("store_age_confirmations").select("id", { count: "exact", head: true }).eq("store_id", storeId),
  ]);
  // Apagada y sin confirmaciones: no hay nada que mostrar
  if (!active && !count) return null;
  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="font-semibold">Confirmaciones de mayoría de edad</h3>
      <p className="text-sm text-slate-600">
        {count ? `${count} ${count === 1 ? "persona confirmó" : "personas confirmaron"} que son mayores de edad al entrar a tu tienda.` : "Todavía nadie ha entrado a tu tienda."}
        {count && count > 50 ? " Se muestran las 50 más recientes." : ""}
      </p>
      {!!rows?.length && (
        <ul className="mt-3 divide-y rounded-2xl border text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name || r.email || "Visitante sin cuenta"}</span>
                <span className="block truncate text-xs text-slate-500">
                  {r.name && r.email ? `${r.email} · ` : ""}
                  {device(r.user_agent)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{formatDate(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
