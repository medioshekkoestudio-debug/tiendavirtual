import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { adultCookieName } from "@/lib/age-gate";
import { AgeGate } from "./age-gate";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/components/cart";
import { themeStyle } from "@/components/theme-vars";
import { getSession } from "@/lib/auth";
import { siteTier } from "@/lib/site";
import { getStoreBySlug } from "@/lib/storefront";
import { StoreTopBar } from "./top-bar";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return { title: "Tienda no encontrada" };
  return {
    title: { default: store.name, template: `%s · ${store.name}` },
    description: store.description?.slice(0, 160) || `Compra en ${store.name}`,
    alternates: { canonical: `/${store.slug}` },
    manifest: `/${store.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: store.name },
    icons: store.logo_url ? { icon: store.logo_url, apple: store.logo_url } : undefined,
    openGraph: { title: store.name, description: store.description, images: store.slider_images[0] ? [store.slider_images[0]] : undefined },
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  return { themeColor: store?.primary_color ?? "#009688" };
}

export default async function StoreLayout({ children, params }: Params & { children: React.ReactNode }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  if (!store.is_active || !store.onboarding_completed) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center" style={themeStyle(store)}>
        <div>
          <h1 className="font-brand text-2xl font-bold">{store.name}</h1>
          <p className="mt-2 text-slate-600">
            {store.is_active ? "Estamos preparando nuestra tienda. ¡Vuelve pronto!" : "Esta tienda no está disponible por el momento."}
          </p>
        </div>
      </div>
    );
  }

  const { profile } = await getSession();

  // No apta para menores: hasta que el cliente confirme su edad no se muestra nada de la tienda (el dueño entra directo)
  if (store.adults_only && profile?.id !== store.owner_id && !(await cookies()).get(adultCookieName(store.id))) {
    return (
      <div style={themeStyle(store)}>
        <AgeGate slug={store.slug} name={store.name} logoUrl={store.logo_url} />
      </div>
    );
  }

  const base = `/${store.slug}`;
  // Business es una página web: Inicio, Tienda y Nosotros además de las compras y los mensajes
  const business = siteTier(store) === "business";
  const pages = business
    ? [
        { href: `${base}/tienda`, label: "Tienda", icon: "store" as const },
        { href: `${base}/nosotros`, label: "Nosotros", icon: "info" as const },
      ]
    : [];

  return (
    <CartProvider storeSlug={store.slug}>
      <div className="min-h-dvh overflow-x-clip bg-slate-50 pb-24" style={themeStyle(store)}>
        {/* El dueño que abre su tienda pública la ve como cliente: el aviso lo lleva al panel para administrarla */}
        {profile?.id === store.owner_id && (
          <div className="flex items-center justify-center gap-3 bg-slate-900 px-4 py-2 text-sm text-white">
            <span>Así ven tu tienda tus clientes.</span>
            <Link href="/panel/tienda" className="shrink-0 rounded-lg bg-white px-3 py-1 font-semibold text-slate-900">
              Cargar productos
            </Link>
          </div>
        )}
        <StoreTopBar
          slug={store.slug}
          name={store.name}
          logoUrl={store.logo_url}
          color={store.primary_color}
          links={business ? [{ href: base, label: "Inicio" }, ...pages] : undefined}
          user={profile ? { name: profile.full_name || profile.email || "Mi cuenta" } : null}
        />
        <main className="mx-auto max-w-3xl">{children}</main>
        <BottomNav
          items={[
            { href: base, label: "Inicio", icon: "home", exact: true },
            ...pages,
            { href: `${base}/compras`, label: "Mis compras", icon: "bag" },
            { href: `${base}/mensajes`, label: "Mensajes", icon: "messages" },
          ]}
        />
      </div>
    </CartProvider>
  );
}
