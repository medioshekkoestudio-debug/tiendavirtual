"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LandingContent } from "@/lib/types";

async function requireSuperadmin() {
  const { supabase, profile } = await getSession();
  if (profile?.role !== "superadmin") redirect("/login");
  return supabase;
}

export async function saveLanding(content: LandingContent): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await requireSuperadmin();
  const clean: LandingContent = {
    brand_name: content.brand_name.trim().slice(0, 40) || "Shopux",
    hero_title: content.hero_title.trim().slice(0, 140),
    hero_subtitle: content.hero_subtitle.trim().slice(0, 300),
    hero_image: /^https?:\/\//.test(content.hero_image) ? content.hero_image.slice(0, 1000) : "",
    description_title: content.description_title.trim().slice(0, 120),
    description: content.description.trim().slice(0, 2000),
    cta_text: content.cta_text.trim().slice(0, 60) || "Crear mi tienda",
    features: content.features.slice(0, 6).map((f) => ({ title: f.title.trim().slice(0, 80), text: f.text.trim().slice(0, 300) })),
    footer_text: content.footer_text.trim().slice(0, 200),
  };
  const { error } = await supabase
    .from("landing_content")
    .update({ content: clean, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function setStoreActive(storeId: string, active: boolean): Promise<{ error?: string }> {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("stores").update({ is_active: active }).eq("id", storeId).select("slug").single();
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  revalidatePath(`/${data.slug}`, "layout");
  return {};
}
