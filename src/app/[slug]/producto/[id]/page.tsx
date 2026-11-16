import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/storefront";
import type { Product } from "@/lib/types";
import { getBcvRate } from "@/lib/exchange-rate";
import { cleanOptions } from "@/lib/product-options";
import { SiteFooter } from "@/components/site-sections";
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
  const rate = store.show_bs !== false ? await getBcvRate() : null;

  return (
    <>
      <ProductDetail product={{ ...product, options: cleanOptions(product.options) }} slug={store.slug} bsRate={rate?.rate ?? null} />
      <SiteFooter store={store} base={`/${store.slug}`} business={siteTier(store) === "business"} />
    </>
  );
}
