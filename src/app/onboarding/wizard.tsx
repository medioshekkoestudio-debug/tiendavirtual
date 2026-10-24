"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Store as StoreIcon } from "lucide-react";
import { BrandingForm } from "@/components/branding-form";
import { CategoryManager, DefaultCategoryPicker } from "@/components/category-manager";
import { PaymentMethodsForm } from "@/components/payment-methods-form";
import { ProductForm } from "@/components/product-form";
import { themeStyle } from "@/components/theme-vars";
import { SITE_DOMAIN } from "@/lib/constants";
import { completeOnboarding } from "@/lib/store-actions";
import type { Category, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Imagen de marca", optional: false },
  { title: "Productos o servicios", optional: true },
  { title: "Métodos de pago", optional: true },
  { title: "¡Listo!", optional: false },
];

export function OnboardingWizard({ store, userId, categories }: { store: Store; userId: string; categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(store.onboarding_step, 3));
  const [showProduct, setShowProduct] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const progress = ((step + 1) / STEPS.length) * 100;
  const link = `${SITE_DOMAIN}/${store.slug}`;

  function finish() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding();
      if (res.error) return setError(res.error);
      router.push("/panel");
      router.refresh();
    });
  }

  return (
    <div className="min-h-dvh bg-slate-50" style={themeStyle(store)}>
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold">
              <StoreIcon className="size-5 text-brand" /> Configura tu tienda
            </div>
            <span className="text-xs text-slate-500">
              Paso {step + 1} de {STEPS.length}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ol className="mt-2 hidden grid-cols-4 gap-2 text-xs sm:grid">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  disabled={i > store.onboarding_step && i > step}
                  onClick={() => setStep(i)}
                  className={cn("text-left", i === step ? "font-semibold text-brand" : "text-slate-500")}
                >
                  {i + 1}. {s.title} {s.optional && <span className="text-slate-400">(opcional)</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-brand/10 px-4 py-3 text-sm">
          <span>Tu link de tienda:</span>
          <span className="font-mono font-semibold text-brand">{link}</span>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 hover:bg-white"
            aria-label="Copiar link"
            onClick={() => navigator.clipboard?.writeText(`https://${link}`)}
          >
            <Copy className="size-4" />
          </button>
        </div>

        {step === 0 && (
          <section className="card p-5">
            <h1 className="text-2xl font-bold">Sección 1 · Imagen de marca</h1>
            <p className="mb-6 text-sm text-slate-600">Así se verá tu app para tus clientes.</p>
            <BrandingForm store={store} userId={userId} submitLabel="Guardar y continuar" onSaved={() => setStep(1)} />
          </section>
        )}

        {step === 1 && (
          <section className="card space-y-6 p-5">
            <div>
              <h1 className="text-2xl font-bold">Sección 2 · Productos o servicios</h1>
              <p className="text-sm text-slate-600">Opcional: también puedes completarlo luego desde tu app.</p>
            </div>
            {categories.length === 0 ? (
              <DefaultCategoryPicker existing={categories} />
            ) : (
              <>
                <CategoryManager categories={categories} />
                <div>
                  {showProduct ? (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h3 className="mb-3 font-semibold">Agrega tu primer producto</h3>
                      <ProductForm categories={categories} userId={userId} onDone={() => setShowProduct(false)} />
                    </div>
                  ) : (
                    <button type="button" className="btn-outline" onClick={() => setShowProduct(true)}>
                      + Agregar un producto ahora
                    </button>
                  )}
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-4">
              <button type="button" className="btn-ghost" onClick={() => setStep(0)}>Atrás</button>
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                {categories.length ? "Continuar" : "Omitir por ahora"}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="card space-y-6 p-5">
            <div>
              <h1 className="text-2xl font-bold">Sección 3 · Métodos de pago</h1>
              <p className="text-sm text-slate-600">
                Estos datos verán tus clientes al pagar. Activa los que aceptas (puedes cambiarlos luego).
              </p>
            </div>
            <PaymentMethodsForm store={store} submitLabel="Guardar y continuar" onSaved={() => setStep(3)} />
            <div className="flex justify-between border-t pt-4">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Atrás</button>
              <button type="button" className="btn-ghost" onClick={() => setStep(3)}>Omitir</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card p-8 text-center">
            <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold">¡Tu tienda está lista!</h1>
            <p className="mt-2 text-slate-600">
              Comparte <span className="font-mono font-semibold text-brand">{link}</span> con tus clientes.
            </p>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            <button type="button" className="btn-primary mt-6 px-8 py-3 text-base" onClick={finish} disabled={pending}>
              {pending ? "Abriendo…" : "Entrar a mi app"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
