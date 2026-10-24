import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/storefront";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { AddToCart } from "./add-to-cart";

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

  return (
    <div className="pb-6">
      <div className="relative">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover sm:aspect-[4/3]" />
        ) : (
          <div className="font-brand grid aspect-[4/3] w-full place-items-center bg-brand/10 text-6xl font-bold text-brand">{product.name[0]}</div>
        )}
        <Link href={`/${store.slug}`} className="absolute left-3 top-3 rounded-full bg-white/90 p-2 shadow" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Link>
      </div>
      <div className="space-y-3 px-4 pt-4">
        <h1 className="font-brand text-2xl font-bold">{product.name}</h1>
        <p className="text-2xl font-extrabold text-brand">{formatMoney(product.price)}</p>
        <p className={product.stock > 0 ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>
          {product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}
        </p>
        {product.description && <p className="whitespace-pre-line leading-relaxed text-slate-700">{product.description}</p>}
        <AddToCart product={product} slug={store.slug} />
      </div>
    </div>
  );
}
