import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/storefront";
import type { Product } from "@/lib/types";
import { getBcvRate } from "@/lib/exchange-rate";
import { cleanOptions } from "@/lib/product-options";
import { SiteFooter } from "@/components/site-sections";
import { RelatedProducts } from "@/components/related-products";
import { siteTier } from "@/lib/site";
import { ProductDetail } from "./product-detail";

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .maybeSingle<Product>();
  if (!product) notFound();
  const base = `/${store.slug}`;

  // Relacionados: misma categoría (primero los de la misma subcategoría y con stock)
  const [rate, { data: sameCategory }] = await Promise.all([
    store.show_bs !== false ? getBcvRate() : Promise.resolve(null),
    product.category_id
      ? supabase
          .from("products")
          .select("*")
          .eq("store_id", store.id)
          .eq("category_id", product.category_id)
          .eq("is_active", true)
          .neq("id", product.id)
          .order("created_at", { ascending: false })
          .limit(16)
          .returns<Product[]>()
      : Promise.resolve({ data: [] as Product[] }),
  ]);
  const score = (p: Product) => (p.subcategory_id && p.subcategory_id === product.subcategory_id ? 2 : 0) + (p.stock > 0 ? 1 : 0);
  const related = [...(sameCategory ?? [])].sort((a, b) => score(b) - score(a)).slice(0, 12);

  return (
    <>
      <ProductDetail product={{ ...product, options: cleanOptions(product.options) }} slug={store.slug} bsRate={rate?.rate ?? null} />
      <RelatedProducts products={related} base={base} bsRate={rate?.rate ?? null} />
      <SiteFooter store={store} base={base} business={siteTier(store) === "business"} />
    </>
  );
}
