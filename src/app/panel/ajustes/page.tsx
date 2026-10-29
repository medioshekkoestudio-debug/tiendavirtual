import Link from "next/link";
import { BrandingForm } from "@/components/branding-form";
import { PLANS } from "@/lib/constants";
import { CategoryManager } from "@/components/category-manager";
import { PaymentMethodsForm } from "@/components/payment-methods-form";
import { getOwnerStore } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { IndustryForm } from "./industry-form";
import { SlugForm } from "./slug-form";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const { supabase, user, store } = await getOwnerStore();
  const { data: categories } = await supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ajustes de la tienda</h1>
      <section className="card flex items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Mi plan</h2>
          <p className="text-sm text-slate-600">
            {store.plan ? `Plan ${PLANS[store.plan].label}` : "Prueba gratis"} · elige o renueva tu plan y paga desde aquí.
          </p>
        </div>
        <Link href="/suscripcion" className="btn-primary shrink-0">Ver planes</Link>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Link de tu tienda</h2>
        <p className="mb-4 text-sm text-slate-600">Es la dirección que compartes con tus clientes.</p>
        <SlugForm slug={store.slug} />
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
