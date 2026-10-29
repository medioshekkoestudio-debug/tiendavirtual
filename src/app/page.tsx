import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, Palette, Smartphone } from "lucide-react";
import { Logo } from "@/components/logo";
import { getLandingContent } from "@/lib/landing";
import { SITE_DOMAIN } from "@/lib/constants";

const FEATURE_ICONS = [Palette, CreditCard, MessageCircle];

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
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
            <Link href="/registro" className="btn-primary hidden sm:inline-flex">Crear tienda</Link>
          </div>
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
      <section id="beneficios" className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {c.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
            return (
              <div key={i} className="card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-6" />
                </span>
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

      {/* Botón grande */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-slate-900 px-6 py-12 text-center text-white">
          <Smartphone className="mx-auto size-10 text-brand" />
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">Tu tienda, como app, lista hoy</h2>
          <Link
            href="/registro"
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand px-8 py-5 text-lg font-bold text-white shadow-lg shadow-brand/40 transition hover:scale-[1.02] md:text-xl"
          >
            {c.cta_text} <ArrowRight className="size-6" />
          </Link>
          <p className="mt-4 text-sm text-white/60">
            ¿Ya tienes tienda? <Link href="/login" className="underline">Inicia sesión</Link>
          </p>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t py-8 text-center text-sm text-slate-500">
        <Logo className="h-7" />
        {c.footer_text}
      </footer>
    </div>
  );
}
