import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingAuthButtons } from "@/components/account-flag";
import { Logo } from "@/components/logo";
import { getLandingContent } from "@/lib/landing";
import { SITE_DOMAIN } from "@/lib/constants";
import { PlansSection } from "./plans-section";

const FEATURE_ICONS = ["/landing/icono-marca-app.png", "/landing/icono-pagos-dinero.png", "/landing/icono-pedidos-chat.png"];

// Redes de Linki App (iconos de marca como trazos SVG; lucide no los trae)
const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/linki.app",
    icon: "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 2c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 7.4a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8zm5.7-7.6a1 1 0 1 1-2.1 0 1 1 0 0 1 2.1 0z",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/1e36PsjfJ2/",
    icon: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@linkiapp.com",
    icon: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 0 0-.8-.1 5.8 5.8 0 1 0 5.8 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4s-1.9.1-3.3-1.6z",
  },
];

export default async function LandingPage() {
  const c = await getLandingContent();

  return (
    <div className="min-h-dvh bg-white">
      {/* Barra de navegación */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label={c.brand_name}>
            <Logo className="h-9 md:h-11" />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#que-es" className="hover:text-slate-900">¿Qué es?</a>
            <a href="#beneficios" className="hover:text-slate-900">Beneficios</a>
            <a href="#como-funciona" className="hover:text-slate-900">Cómo funciona</a>
            <a href="#planes" className="hover:text-slate-900">Planes</a>
          </div>
          <LandingAuthButtons />
        </nav>
      </header>

      {/* Banner */}
      <section className="relative overflow-hidden">
        {/* Fondo: foto de la landing (o la que se suba desde el Superadmin) bajo un velo Azul Marino que deja leer el texto */}
        <div
          className="absolute inset-0 bg-[#004d40]"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,77,64,.92) 0%, rgba(0,77,64,.78) 50%, rgba(0,77,64,.45) 100%), url(${c.hero_image || "/landing/hero-fondo.jpg"})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-accent/40 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 text-white md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Marketplace de tiendas · PWA
            </span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{c.hero_title}</h1>
            <p className="mt-4 text-lg text-white/85">{c.hero_subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/suscripcion"
                className="btn w-full bg-accent px-7 py-3.5 text-base font-bold text-[#004d40] shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:brightness-110 sm:w-auto md:text-lg"
              >
                Crea tu tienda <ArrowRight className="size-5" />
              </Link>
              <a
                href="#planes"
                className="btn w-full border border-white/40 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 sm:w-auto md:text-lg"
              >
                Ver planes
              </a>
            </div>
            <p className="mt-6 text-sm text-white/75">
              Tu link: <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono">{SITE_DOMAIN}/tuempresa</span>
            </p>
          </div>
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/hero-telefonos.png"
              alt="Dos tiendas creadas con Linki App vistas en el teléfono"
              width={430}
              height={485}
              className="w-64 drop-shadow-2xl md:w-full md:max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* Descripción */}
      <section id="que-es" className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-900">{c.description_title}</h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{c.description}</p>
      </section>

      {/* Beneficios */}
      <section
        id="beneficios"
        className="bg-[#8dc21f] bg-cover bg-center py-16"
        style={{ backgroundImage: "url(/landing/beneficios-fondo.png)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {c.features.map((f, i) => {
            const icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
            return (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" className="size-16" />
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-slate-600">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Cómo funciona</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Regístrate", `Crea tu cuenta y obtén tu link ${SITE_DOMAIN}/tuempresa al instante.`],
            ["Personaliza", "Sube tu logo, colores, slider, tipografía y tus productos."],
            ["Vende", "Comparte tu link, recibe pedidos y aprueba pagos desde tu app."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-bold">{t}</h3>
                <p className="text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <PlansSection />

      {/* Botón grande */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-brand-2 px-6 pb-12 pt-8 text-center text-white">
          {/* Patrón de links detrás de Linkito, desvanecido hacia los bordes */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[70%] w-full text-white/10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
          >
            <defs>
              <pattern id="cta-links" width="200" height="90" patternUnits="userSpaceOnUse">
                <g fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round">
                  <path d="M60 15H45a30 30 0 0 0 0 60h15M140 15h15a30 30 0 0 1 0 60h-15" />
                  <path d="M70 45h40m-14-14 14 14-14 14" />
                </g>
                <g fill="currentColor">
                  <circle cx="125" cy="45" r="6" />
                  <circle cx="142" cy="45" r="6" />
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-links)" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/linkito-telefono.png"
            alt="Linkito mostrando una tienda en el teléfono"
            className="relative mx-auto w-full max-w-sm"
          />
          <h2 className="relative mt-4 text-2xl font-bold md:text-3xl">Tu tienda, como app, lista hoy</h2>
          <Link
            href="/suscripcion"
            className="relative mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand px-8 py-5 text-lg font-bold text-white shadow-lg shadow-brand/40 transition hover:scale-[1.02] md:text-xl"
          >
            {c.cta_text} <ArrowRight className="size-6" />
          </Link>
          <p className="relative mt-4 text-sm text-white/60">
            ¿Ya tienes tienda? <Link href="/login" className="underline">Inicia sesión</Link>
          </p>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t py-8 text-center text-sm text-slate-500">
        <Logo className="h-7" />
        <ul className="flex gap-3">
          {SOCIAL_LINKS.map((s) => (
            <li key={s.name}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.name} de Linki App`}
                className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-brand hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                  <path d={s.icon} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
        {c.footer_text}
      </footer>
    </div>
  );
}
