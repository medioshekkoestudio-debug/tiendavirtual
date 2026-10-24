import { notFound } from "next/navigation";
import { StorefrontHome } from "@/components/storefront-home";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/storefront";
import type { Category, Product } from "@/lib/types";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("store_id", store.id).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name"),
  ]);

  return (
    <StorefrontHome
      store={store}
      products={(products ?? []) as Product[]}
      categories={(categories ?? []) as Category[]}
      linkBase={`/${store.slug}`}
    />
  );
}
