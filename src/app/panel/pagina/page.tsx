import Link from "next/link";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { getOwnerStore } from "@/lib/auth";
import { PLANS } from "@/lib/constants";
import { resolveSite, siteTier, suggestedSite } from "@/lib/site";
import { SiteEditor } from "./site-editor";

export const metadata = { title: "Mi página web" };

const UPGRADES = [
  {
    plan: "pro" as const,
    items: ["Portada con tu logo, tu frase y una foto", "Tus puntos fuertes con iconos", "Sección «Quiénes somos» con foto", "Contacto: WhatsApp, Instagram, dirección y horario"],
  },
  {
    plan: "business" as const,
    items: ["Una página web completa, no solo la tienda", "Inicio tipo landing con portada a todo lo ancho", "Página «Nosotros»: historia, misión, visión y valores", "Galería de fotos y opiniones de clientes", "Menú con Inicio, Tienda y Nosotros"],
  },
];

export default async function SitePage() {
  const { user, store } = await getOwnerStore();
  const tier = siteTier(store);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/panel/tienda" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500">
            <ArrowLeft className="size-4" /> Tienda
          </Link>
          <h1 className="text-2xl font-bold">Mi página web</h1>
          <p className="text-sm text-slate-600">
            Tu plan: <strong>{PLANS[tier].label}</strong>. Ya tiene un diseño y textos sugeridos para tu rubro; cámbialos cuando quieras.
          </p>
        </div>
        <Link href={`/${store.slug}`} target="_blank" className="btn-outline">
          Ver mi página <ExternalLink className="size-4" />
        </Link>
      </div>

      {tier === "emprendedor" ? (
        <>
          <p className="card p-5 text-sm text-slate-700">
            Con el plan Emprendedor tu app muestra el slider, la descripción y tus productos. Mejora tu plan para tener una página más completa:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {UPGRADES.map((u) => (
              <section key={u.plan} className="card p-5">
                <h2 className="text-lg font-bold">Plan {PLANS[u.plan].label}</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {u.items.map((i) => (
                    <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" /> {i}</li>
                  ))}
                </ul>
                <Link href="/suscripcion" className="btn-primary mt-4">Mejorar a {PLANS[u.plan].label}</Link>
              </section>
            ))}
          </div>
        </>
      ) : (
        <SiteEditor
          tier={tier}
          userId={user.id}
          initial={resolveSite(store)}
          suggested={suggestedSite(store)}
          sliderImage={store.slider_images[0] ?? null}
        />
      )}
    </div>
  );
}
