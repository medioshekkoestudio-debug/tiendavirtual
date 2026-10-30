import Link from "next/link";
import { BrandingForm } from "@/components/branding-form";
import { PLANS } from "@/lib/constants";
import { CategoryManager } from "@/components/category-manager";
import { PaymentMethodsForm } from "@/components/payment-methods-form";
import { ShareStoreWhatsApp } from "@/components/share-whatsapp";
import { storeUrl } from "@/lib/utils";
import { PhoneForm } from "./phone-form";
import { getOwnerStore } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { IndustryForm } from "./industry-form";
import { ShowBsToggle } from "./show-bs-toggle";
import { SlugForm } from "./slug-form";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const { supabase, user, profile, store } = await getOwnerStore();
  const { data: categories } = await supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ajustes de la tienda</h1>
      <section className="card flex items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Mi plan</h2>
          <p className="text-sm text-slate-600">
            {store.plan ? `Plan ${PLANS[store.plan].label}` : store.coupon_code ? `Cupón ${store.coupon_code}` : "Sin plan"} · elige o renueva tu plan, y paga tus comisiones por venta.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link href="/panel/comisiones" className="btn-outline">Comisiones</Link>
          <Link href="/suscripcion" className="btn-primary">Ver planes</Link>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Mi perfil</h2>
        <p className="mb-4 text-sm text-slate-600">
          {profile.full_name}
          {profile.email && <> · {profile.email}</>}
        </p>
        <PhoneForm phone={profile.phone ?? ""} />
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Link de tu tienda</h2>
        <p className="mb-4 text-sm text-slate-600">Es la dirección que compartes con tus clientes.</p>
        <SlugForm slug={store.slug} />
        <ShareStoreWhatsApp storeName={store.name} url={storeUrl(store.slug)} className="mt-4 w-full sm:w-auto" />
      </section>
      <section className="card p-5">
        <ShowBsToggle initial={store.show_bs ?? true} />
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Rubro</h2>
        <p className="mb-4 text-sm text-slate-600">A qué se dedica tu tienda.</p>
        <IndustryForm industry={store.industry} />
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold">Imagen de marca</h2>
        <BrandingForm store={store} userId={user.id} />
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold">Categorías</h2>
        <CategoryManager categories={(categories ?? []) as Category[]} />
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Métodos de pago</h2>
        <p className="mb-4 text-sm text-slate-600">Tus clientes verán estos datos al registrar su pago.</p>
        <PaymentMethodsForm store={store} />
      </section>
    </div>
  );
}
