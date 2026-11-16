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
import type { Metadata } from "next";
import { formatMoney } from "@/lib/utils";

type Params = { params: Promise<{ slug: string; id: string }> };

// Vista previa al compartir el enlace (WhatsApp, Facebook…): foto, nombre y precio del producto
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || !/^[0-9a-f-]{36}$/i.test(id)) return {};
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("name, description, price, image_url")
    .eq("id", id)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .maybeSingle<Pick<Product, "name" | "description" | "price" | "image_url">>();
  if (!p) return {};
  const description = `${formatMoney(p.price)} · ${p.description?.trim().slice(0, 140) || `Cómpralo en ${store.name}`}`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/${store.slug}/producto/${id}` },
    openGraph: {
      type: "website",
      title: `${p.name} — ${store.name}`,
      description,
      url: `/${store.slug}/producto/${id}`,
      images: p.image_url ? [{ url: p.image_url, alt: p.name }] : store.logo_url ? [store.logo_url] : undefined,
    },
    twitter: { card: p.image_url ? "summary_large_image" : "summary", title: p.name, description },
  };
}

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
