import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, Palette, Smartphone, Store } from "lucide-react";
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
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
              <Store className="size-5" />
            </span>
            {c.brand_name}
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
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-700 via-brand to-fuchsia-500"
          style={c.hero_image ? { backgroundImage: `linear-gradient(rgba(30,27,75,.65),rgba(30,27,75,.65)), url(${c.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 text-white md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
              Marketplace de tiendas · PWA
            </span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{c.hero_title}</h1>
            <p className="mt-4 text-lg text-white/85">{c.hero_subtitle}</p>
            <p className="mt-6 text-sm text-white/75">
              Tu link: <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono">{SITE_DOMAIN}/tuempresa</span>
            </p>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="w-64 rounded-[2.5rem] border-8 border-white/20 bg-white p-3 text-slate-900 shadow-2xl">
              <div className="h-24 rounded-2xl bg-gradient-to-r from-amber-300 to-rose-400" />
              <div className="mt-3 h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-slate-100 p-2">
                    <div className="h-14 rounded-lg bg-slate-200" />
                    <div className="mt-2 h-2 w-12 rounded bg-slate-300" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-around border-t pt-2 text-[10px] text-slate-500">
                <span>Inicio</span><span>Tienda</span><span>Pagos</span><span>Pedidos</span>
              </div>
            </div>
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
            ["Regístrate", "Crea tu cuenta y obtén tu link shopuxapp.com/tuempresa al instante."],
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
          <Smartphone className="mx-auto size-10 text-amber-300" />
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

      <footer className="border-t py-8 text-center text-sm text-slate-500">{c.footer_text}</footer>
    </div>
  );
}
