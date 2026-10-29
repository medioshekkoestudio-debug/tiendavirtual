import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/components/cart";
import { themeStyle } from "@/components/theme-vars";
import { getSession } from "@/lib/auth";
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
  const base = `/${store.slug}`;

  return (
    <CartProvider storeSlug={store.slug}>
      <div className="min-h-dvh bg-slate-50 pb-24" style={themeStyle(store)}>
        <StoreTopBar
          slug={store.slug}
          name={store.name}
          logoUrl={store.logo_url}
          user={profile ? { name: profile.full_name || profile.email || "Mi cuenta" } : null}
        />
        <main className="mx-auto max-w-3xl">{children}</main>
        <BottomNav
          items={[
            { href: base, label: "Inicio", icon: "home", exact: true },
            { href: `${base}/compras`, label: "Mis compras", icon: "bag" },
            { href: `${base}/mensajes`, label: "Mensajes", icon: "messages" },
          ]}
        />
      </div>
    </CartProvider>
  );
}
