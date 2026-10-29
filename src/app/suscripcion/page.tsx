import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { PaymentStatusBadge } from "@/components/ui";
import { getOwnerStore, getSession } from "@/lib/auth";
import { PAYMENT_METHODS, PLANS, isPlan, isPlanCycle } from "@/lib/constants";
import type { PaymentMethodConfig, PlanPaymentMethodKey, SubscriptionPayment } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { SubscriptionCheckout } from "./checkout";

export const metadata = { title: "Planes" };

type Search = Promise<{ plan?: string; ciclo?: string }>;

/** Pasarela de planes. Pública: sin tienda, el pago incluye el registro; con tienda, paga o renueva su plan. */
export default async function SubscriptionPage({ searchParams }: { searchParams: Search }) {
  const { supabase, profile } = await getSession();
  const sp = await searchParams;
  if (profile?.role === "store_owner") return <OwnerSubscription sp={sp} />;

  const { data: settings } = await supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle();
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/#planes" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Volver a los planes">
            <ArrowLeft className="size-5" />
          </Link>
          <Logo className="h-8" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Activa tu plan</h1>
          <p className="mt-1 text-sm text-slate-600">Elige tu plan, crea tu cuenta y adjunta tu pago en un solo paso.</p>
        </div>
        <SubscriptionCheckout
          methods={(settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>}
          initialPlan={isPlan(sp.plan) ? sp.plan : "pro"}
          initialCycle={isPlanCycle(sp.ciclo) ? sp.ciclo : "mensual"}
        />
      </main>
    </div>
  );
}

async function OwnerSubscription({ sp }: { sp: Awaited<Search> }) {
  const { supabase, user, store } = await getOwnerStore(true);
  const [{ data: settings }, { data: payments }] = await Promise.all([
    supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle(),
    supabase.from("subscription_payments").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const methods = (settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  const history = (payments ?? []) as SubscriptionPayment[];
  const pending = history.find((p) => p.status === "pendiente");

  const now = Date.now();
  const active = store.plan && store.plan_expires_at && new Date(store.plan_expires_at).getTime() > now;
  const inTrial = !active && store.trial_ends_at && new Date(store.trial_ends_at).getTime() > now;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href={store.onboarding_completed ? "/panel" : "/onboarding"} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Link>
          <Logo className="h-8" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Mi plan</h1>
          <p className="mt-1 text-sm text-slate-600">
            {active ? (
              <>
                Tienes el <strong>Plan {PLANS[store.plan!].label}</strong> ({store.plan_cycle}) activo hasta el{" "}
                <strong>{formatDate(store.plan_expires_at!, false)}</strong>.
              </>
            ) : inTrial ? (
              <>
                Estás en tu prueba gratis hasta el <strong>{formatDate(store.trial_ends_at!, false)}</strong>.
              </>
            ) : (
              <>Tu tienda no tiene un plan activo.</>
            )}
          </p>
        </div>

        {pending ? (
          <section className="card p-5">
            <h2 className="text-lg font-bold">Tu pago está en revisión</h2>
            <p className="mt-1 text-sm text-slate-600">
              Recibimos tu pago del Plan {PLANS[pending.plan].label} ({pending.cycle}) por {formatMoney(pending.amount_usd)}. Lo verificaremos y
              activaremos tu plan lo antes posible.
            </p>
          </section>
        ) : (
          <SubscriptionCheckout
            userId={user.id}
            methods={methods}
            initialPlan={isPlan(sp.plan) ? sp.plan : (store.plan ?? "pro")}
            initialCycle={isPlanCycle(sp.ciclo) ? sp.ciclo : (store.plan_cycle ?? "mensual")}
          />
        )}

        {history.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Pagos de tu plan</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {history.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      Plan {PLANS[p.plan].label} · {p.cycle} · {formatMoney(p.amount_usd)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(p.created_at)} · {PAYMENT_METHODS[p.method].label} · Ref. {p.reference}
                    </p>
                  </div>
                  <PaymentStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
