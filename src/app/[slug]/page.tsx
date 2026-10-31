import { notFound } from "next/navigation";
import {
  About, BusinessHero, Contact, CtaBand, FeaturedProducts, FullBleed, Gallery, Highlights, ProHero, SiteFooter, Testimonials,
} from "@/components/site-sections";
import { StorefrontHome } from "@/components/storefront-home";
import { resolveSite, siteTier } from "@/lib/site";
import { getStoreBySlug, getStoreCatalog } from "@/lib/storefront";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const { products, categories, bsRate } = await getStoreCatalog(store);
  const base = `/${store.slug}`;
  const tier = siteTier(store);
  const catalog = (
    <StorefrontHome store={store} products={products} categories={categories} linkBase={base} bsRate={bsRate} hideIntro={tier !== "emprendedor"} />
  );
  if (tier === "emprendedor") return catalog;

  const site = resolveSite(store);
  // Foto de portada: la que eligió, si no la primera del slider o de un producto
  const productImages = products.map((p) => p.image_url).filter((u): u is string => !!u);
  const heroImage = site.hero_image ?? store.slider_images[0] ?? null;
  const aboutImage = site.about_image ?? store.slider_images[1] ?? productImages[0] ?? null;

  if (tier === "pro") {
    return (
      <>
        <ProHero site={site} logoUrl={store.logo_url} image={heroImage} />
        <Highlights site={site} />
        <div className="pt-2">{catalog}</div>
        <About site={site} image={aboutImage} />
        <Contact site={site} base={base} />
        <SiteFooter name={store.name} base={base} />
      </>
    );
  }

  // El contenedor de la tienda es angosto; la landing usa todo el ancho y centra cada sección
  return (
    <FullBleed>
      <BusinessHero site={site} logoUrl={store.logo_url} image={heroImage} base={base} />
      <Highlights site={site} wide />
      <FeaturedProducts products={products.slice(0, 8)} base={base} bsRate={bsRate} />
      <About site={site} image={aboutImage} wide more={`${base}/nosotros`} />
      <Gallery images={site.gallery.length ? site.gallery : productImages.slice(0, 6)} />
      <Testimonials site={site} />
      <CtaBand base={base} />
      <Contact site={site} base={base} wide />
      <SiteFooter name={store.name} base={base} business />
    </FullBleed>
  );
}
