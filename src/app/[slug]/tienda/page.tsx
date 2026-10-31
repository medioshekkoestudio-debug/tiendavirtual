import { notFound, redirect } from "next/navigation";
import { FullBleed, SiteFooter } from "@/components/site-sections";
import { StorefrontHome } from "@/components/storefront-home";
import { siteTier } from "@/lib/site";
import { getStoreBySlug, getStoreCatalog } from "@/lib/storefront";

export const metadata = { title: "Tienda" };

/** Catálogo completo del plan Business (en los otros planes el catálogo es el inicio) */
export default async function StoreCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const base = `/${store.slug}`;
  if (siteTier(store) !== "business") redirect(base);

  const { products, categories, bsRate } = await getStoreCatalog(store);
  return (
    <FullBleed>
      <div className="mx-auto max-w-5xl">
        <StorefrontHome store={store} products={products} categories={categories} linkBase={base} bsRate={bsRate} hideIntro title={`Tienda de ${store.name}`} />
      </div>
      <SiteFooter name={store.name} base={base} business />
    </FullBleed>
  );
}
