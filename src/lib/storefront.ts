import { cache } from "react";
import { getBcvRate } from "./exchange-rate";
import { createClient } from "./supabase/server";
import type { Category, Product, Store } from "./types";

export const getStoreBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").eq("slug", slug.toLowerCase()).maybeSingle<Store>();
  return data;
});

/** Productos activos, categorías y tasa BCV (si la tienda muestra Bs) para el inicio y el catálogo */
export async function getStoreCatalog(store: Store) {
  const supabase = await createClient();
  const [{ data: products }, { data: categories }, rate] = await Promise.all([
    supabase.from("products").select("*").eq("store_id", store.id).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name"),
    store.show_bs !== false ? getBcvRate() : null,
  ]);
  return { products: (products ?? []) as Product[], categories: (categories ?? []) as Category[], bsRate: rate?.rate };
}
