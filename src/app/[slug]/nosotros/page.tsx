import { notFound, redirect } from "next/navigation";
import { Contact, CtaBand, FullBleed, Gallery, MissionVision, SiteFooter, Testimonials, Values } from "@/components/site-sections";
import { resolveSite, siteTier } from "@/lib/site";
import { getStoreBySlug } from "@/lib/storefront";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const store = await getStoreBySlug((await params).slug);
  return { title: "Nosotros", description: store ? resolveSite(store).about_text.slice(0, 160) : undefined };
}

/** Página «Nosotros» del plan Business: historia, misión, visión, valores, galería y contacto */
export default async function AboutPage({ params }: Params) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const base = `/${store.slug}`;
  const tier = siteTier(store);
  if (tier === "pro") redirect(`${base}#nosotros`);
  if (tier !== "business") redirect(base);

  const site = resolveSite(store);
  const image = site.about_image ?? store.slider_images[0] ?? null;

  return (
    <FullBleed>
      <FullBleed className="overflow-hidden bg-brand-2 text-white">
        {image && (
          <div aria-hidden className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="size-full object-cover opacity-35" />
          </div>
        )}
        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{site.about_title}</p>
          <h1 className="font-brand mt-2 text-4xl font-extrabold sm:text-5xl">{store.name}</h1>
        </div>
      </FullBleed>

      <section className="mx-auto max-w-5xl px-4 pt-12">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr] sm:items-start">
          <p className="whitespace-pre-line text-lg leading-relaxed text-slate-700">{site.about_text}</p>
          {store.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt={store.name} className="mx-auto max-h-48 w-auto rounded-3xl bg-white object-contain p-6 shadow-sm ring-1 ring-slate-200" />
          )}
        </div>
      </section>

      <MissionVision site={site} />
      <Values site={site} />
      <Gallery images={site.gallery} />
      <Testimonials site={site} />
      <CtaBand base={base} title="¿Te gustaría conocer lo que hacemos?" />
      <Contact site={site} base={base} wide />
      <SiteFooter name={store.name} base={base} business />
    </FullBleed>
  );
}
