import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { Profile, Store } from "./types";

export const getSession = cache(async () => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no está configurado: copia .env.example a .env.local y completa las claves.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile };
});

/** Para el panel de la tienda: exige dueño de tienda y devuelve su tienda. */
export const getOwnerStore = cache(async (allowIncomplete: boolean = false) => {
  const { supabase, user, profile } = await getSession();
  if (!user || !profile) redirect("/login");
  if (profile.role === "superadmin") redirect("/superadmin");
  if (profile.role !== "store_owner") redirect("/");
  const { data: store } = await supabase.from("stores").select("*").eq("owner_id", user.id).single<Store>();
  if (!store) redirect("/login");
  if (!store.onboarding_completed && !allowIncomplete) redirect("/onboarding");
  return { supabase, user, profile, store };
});

export function homeForRole(role: Profile["role"] | undefined) {
  if (role === "superadmin") return "/superadmin";
  if (role === "store_owner") return "/panel";
  return "/";
}
