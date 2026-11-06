import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600; // las tiendas nuevas entran al mapa en menos de una hora

/** Mapa del sitio para Google: la landing, el registro y cada tienda pública activa */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { data } = await createAdminClient()
    .from("stores")
    .select("slug, created_at")
    .eq("is_active", true)
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/registro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/suscripcion`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/terminos-y-condiciones`, changeFrequency: "yearly", priority: 0.3 },
    ...(data ?? []).map((s) => ({ url: `${base}/${s.slug}`, lastModified: s.created_at, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
