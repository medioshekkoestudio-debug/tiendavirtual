// Secciones de la página web de la tienda (planes Pro y Business). Ver lib/site.ts.

import Link from "next/link";
import {
  ArrowRight, Award, Clock, Heart, Leaf, MapPin, MessageCircle, Quote, Shield, Smile, Sparkles, Star, Tag, Truck, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { IconKey, ResolvedSite } from "@/lib/site";
import { instagramLink, whatsappLink } from "@/lib/site";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./storefront-home";

const ICONS: Record<IconKey, LucideIcon> = {
  star: Star, truck: Truck, shield: Shield, heart: Heart, sparkles: Sparkles, clock: Clock,
  wrench: Wrench, tag: Tag, chat: MessageCircle, leaf: Leaf, award: Award, smile: Smile,
};

/** Ocupa todo el ancho de la pantalla aunque esté dentro del contenedor angosto de la tienda */
export function FullBleed({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("relative ml-[calc(50%-50vw)] w-screen", className)}>{children}</div>;
}

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", light ? "text-white/80" : "text-brand")}>{children}</p>;
}

/** Fondo de marca cuando no hay foto: degradado con círculos suaves */
function BrandBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-gradient-to-br from-brand-2 to-brand">
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
      <div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-white/10" />
      <div className="absolute right-1/4 top-1/3 size-24 rounded-full bg-accent/30 blur-2xl" />
    </div>
  );
}

function PhotoBackdrop({ src }: { src: string }) {
  return (
    <div aria-hidden className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />
    </div>
  );
}

function Logo({ src, name, size = "size-14" }: { src: string | null; name: string; size?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn(size, "rounded-2xl bg-white object-contain p-1.5 shadow-lg")} />
  ) : (
    <span className={cn(size, "font-brand grid place-items-center rounded-2xl bg-white text-xl font-bold text-brand shadow-lg")}>{name[0]}</span>
  );
}

/** Presentación del plan Pro: foto o color de marca, logo, nombre y frase */
export function ProHero({ site, logoUrl, image }: { site: ResolvedSite; logoUrl: string | null; image: string | null }) {
  return (
    <section className="relative overflow-hidden text-white sm:mx-4 sm:mt-4 sm:rounded-3xl">
      {image ? <PhotoBackdrop src={image} /> : <BrandBackdrop />}
      <div className="relative flex min-h-64 flex-col justify-end gap-3 p-6 sm:min-h-72 sm:p-8">
        <Logo src={logoUrl} name={site.hero_title} />
        <h1 className="font-brand text-3xl font-extrabold leading-tight drop-shadow sm:text-4xl">{site.hero_title}</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/90">{site.hero_subtitle}</p>
        <a href="#catalogo" className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow">
          Ver productos <ArrowRight className="size-4" />
        </a>
      </div>
    </section>
  );
}

/** Inicio del plan Business: portada a todo lo ancho */
export function BusinessHero({ site, logoUrl, image, base }: { site: ResolvedSite; logoUrl: string | null; image: string | null; base: string }) {
  return (
    <FullBleed className="-mt-px overflow-hidden text-white">
      {image ? <PhotoBackdrop src={image} /> : <BrandBackdrop />}
      <div className="relative mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-center gap-5 px-6 py-16 sm:min-h-[560px]">
        <Logo src={logoUrl} name={site.hero_title} size="size-16" />
        <h1 className="font-brand max-w-3xl text-4xl font-extrabold leading-[1.05] drop-shadow sm:text-6xl">{site.hero_title}</h1>
        <p className="max-w-xl text-lg leading-relaxed text-white/90">{site.hero_subtitle}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href={`${base}/tienda`} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]">
            Ver catálogo <ArrowRight className="size-4" />
          </Link>
          <Link href={`${base}/nosotros`} className="inline-flex items-center rounded-full border-2 border-white/70 px-6 py-3 font-bold text-white transition hover:bg-white/10">
            Conócenos
          </Link>
        </div>
      </div>
    </FullBleed>
  );
}

export function Highlights({ site, wide }: { site: ResolvedSite; wide?: boolean }) {
  return (
    <section className={cn("px-4", wide ? "mx-auto max-w-5xl pt-14" : "pt-6")}>
      <div className={cn("grid gap-3", wide ? "sm:grid-cols-3 sm:gap-5" : "grid-cols-1 sm:grid-cols-3")}>
        {site.highlights.map((h, i) => {
          const Icon = ICONS[site.icons[i] ?? "star"];
          return (
            <div key={i} className={cn("flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", wide && "sm:flex-col sm:p-6")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-brand font-bold">{h.title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{h.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** «Quiénes somos»: foto y texto. Con `more` el texto se corta y lleva a la página Nosotros. */
export function About({ site, image, wide, more }: { site: ResolvedSite; image: string | null; wide?: boolean; more?: string }) {
  return (
    <section id="nosotros" className={cn("scroll-mt-20 px-4", wide ? "mx-auto max-w-5xl pt-16" : "pt-10")}>
      <div className={cn("grid items-center gap-6 overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200", image && "sm:grid-cols-2", wide && "sm:p-8")}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
        )}
        <div>
          <Eyebrow>{site.about_title}</Eyebrow>
          <h2 className="font-brand mt-2 text-2xl font-extrabold sm:text-3xl">{site.hero_title}</h2>
          <p className={cn("mt-3 whitespace-pre-line leading-relaxed text-slate-600", more && "line-clamp-5")}>{site.about_text}</p>
          {more && (
            <Link href={more} className="mt-4 inline-flex items-center gap-1.5 font-bold text-brand">
              Conoce nuestra historia <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function FeaturedProducts({ products, base, bsRate }: { products: Product[]; base: string; bsRate?: number | null }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Catálogo</Eyebrow>
          <h2 className="font-brand mt-1 text-2xl font-extrabold sm:text-3xl">Lo más nuevo</h2>
        </div>
        <Link href={`${base}/tienda`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand">
          Ver todo <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} href={`${base}/producto/${p.id}`} bsRate={bsRate} />
        ))}
      </div>
    </section>
  );
}

export function Gallery({ images, title = "Galería" }: { images: string[]; title?: string }) {
  if (!images.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" loading="lazy" className={cn("aspect-square w-full rounded-2xl object-cover", i === 0 && images.length > 2 && "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full")} />
        ))}
      </div>
    </section>
  );
}

export function Testimonials({ site }: { site: ResolvedSite }) {
  if (!site.testimonials.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16">
      <Eyebrow>Opiniones</Eyebrow>
      <h2 className="font-brand mt-1 text-2xl font-extrabold sm:text-3xl">Lo que dicen nuestros clientes</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {site.testimonials.map((t, i) => (
          <figure key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <Quote className="size-6 text-brand/40" />
            <blockquote className="mt-2 text-sm leading-relaxed text-slate-700">{t.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold">{t.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function MissionVision({ site }: { site: ResolvedSite }) {
  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-4 pt-12 sm:grid-cols-2">
      {[["Misión", site.mission], ["Visión", site.vision]].map(([label, text]) => (
        <div key={label} className="rounded-3xl bg-brand/10 p-6">
          <Eyebrow>{label}</Eyebrow>
          <p className="font-brand mt-2 text-lg font-semibold leading-snug">{text}</p>
        </div>
      ))}
    </section>
  );
}

export function Values({ site }: { site: ResolvedSite }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-14">
      <Eyebrow>Nuestros valores</Eyebrow>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {site.values.map((v, i) => {
          const Icon = ICONS[site.value_icons[i] ?? "heart"];
          return (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="grid size-11 place-items-center rounded-full bg-brand text-on-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="font-brand mt-3 font-bold">{v.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{v.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Franja final para llevar al catálogo o al chat */
export function CtaBand({ base, title = "¿Listo para hacer tu pedido?" }: { base: string; title?: string }) {
  return (
    <FullBleed className="mt-16 overflow-hidden bg-brand-2 text-white">
      <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-brand text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/tienda`} className="rounded-full bg-white px-6 py-3 font-bold text-slate-900">Ver catálogo</Link>
          <Link href={`${base}/mensajes`} className="rounded-full border-2 border-white/70 px-6 py-3 font-bold">Escríbenos</Link>
        </div>
      </div>
    </FullBleed>
  );
}

/** Contacto: WhatsApp, Instagram, dirección, horario y el chat de la tienda (siempre disponible) */
export function Contact({ site, base, wide }: { site: ResolvedSite; base: string; wide?: boolean }) {
  const wa = whatsappLink(site.whatsapp);
  const ig = instagramLink(site.instagram);
  return (
    <section id="contacto" className={cn("scroll-mt-20 px-4", wide ? "mx-auto max-w-5xl pt-14" : "pt-10")}>
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <Eyebrow>Contacto</Eyebrow>
        <h2 className="font-brand mt-1 text-2xl font-extrabold">Estamos para ayudarte</h2>
        {(site.address || site.hours) && (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {site.address && (
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {site.address}</li>
            )}
            {site.hours && (
              <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-brand" /> {site.hours}</li>
            )}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`${base}/mensajes`} className="btn-primary"><MessageCircle className="size-4" /> Envíanos un mensaje</Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline">WhatsApp</a>
          )}
          {ig && (
            <a href={ig.url} target="_blank" rel="noopener noreferrer" className="btn-outline"><InstagramIcon /> {ig.handle}</a>
          )}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ name, base, business }: { name: string; base: string; business?: boolean }) {
  return (
    <footer className="mt-14 border-t border-slate-200 px-4 pt-8 text-center text-sm text-slate-500">
      <p className="font-brand text-base font-bold text-slate-800">{name}</p>
      {business && (
        <nav className="mt-3 flex justify-center gap-5 font-medium">
          <Link href={base}>Inicio</Link>
          <Link href={`${base}/tienda`}>Tienda</Link>
          <Link href={`${base}/nosotros`}>Nosotros</Link>
          <Link href={`${base}/mensajes`}>Contacto</Link>
        </nav>
      )}
      <p className="mt-4 text-xs">
        Hecho con{" "}
        <a href="https://linkiapp.com" className="font-semibold text-slate-700">Linki App</a>
      </p>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
