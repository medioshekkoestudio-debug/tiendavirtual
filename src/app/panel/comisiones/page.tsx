import Link from "next/link";
import { PaymentStatusBadge, PeriodTabs, StatCard } from "@/components/ui";
import { getOwnerStore } from "@/lib/auth";
import { getBcvRate } from "@/lib/exchange-rate";
import { PAID_STATUSES, PAYMENT_METHODS, PLANS } from "@/lib/constants";
import type {
  CommissionPayment,
  CommissionState,
  CommissionSummary,
  PaymentMethodConfig,
  PaymentStatus,
  PlanPaymentMethodKey,
  SubscriptionPayment,
} from "@/lib/types";
import { formatDate, formatMoney, parsePeriod, periodStart } from "@/lib/utils";
import { CommissionsBoard, type CommissionRow } from "./board";

export const metadata = { title: "Comisiones y plan" };

type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  commission: number;
  created_at: string;
  commission_payment_items: { commission_payments: { status: PaymentStatus } | null }[];
};

function stateOf(o: OrderRow): CommissionState {
  const statuses = o.commission_payment_items.map((i) => i.commission_payments?.status);
  if (statuses.includes("aprobado")) return "pagada";
  if (statuses.includes("pendiente")) return "en_revision";
  return "por_pagar";
}

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { supabase, user, store } = await getOwnerStore();
  const period = parsePeriod((await searchParams).periodo, "mes");
  const start = periodStart(period);

  let ordersQ = supabase
    .from("orders")
    .select("id, order_number, customer_name, total, commission, created_at, commission_payment_items(commission_payments(status))")
    .eq("store_id", store.id)
    .in("status", PAID_STATUSES)
    .gt("commission", 0)
    .order("created_at", { ascending: false })
    .limit(500);
  if (start) ordersQ = ordersQ.gte("created_at", start.toISOString());

  const [{ data: orders }, { data: summaryRows }, { data: payments }, { data: subs }, { data: settings }, rate] = await Promise.all([
    ordersQ,
    supabase.rpc("store_commission_summary", { p_store: store.id }),
    supabase.from("commission_payments").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("subscription_payments").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle(),
    getBcvRate(),
  ]);

  const rows: CommissionRow[] = ((orders ?? []) as unknown as OrderRow[]).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name,
    total: Number(o.total),
    commission: Number(o.commission),
    created_at: o.created_at,
    state: stateOf(o),
  }));
  const raw = (summaryRows as CommissionSummary[] | null)?.[0];
  const summary: CommissionSummary = {
    generated: Number(raw?.generated ?? 0),
    paid: Number(raw?.paid ?? 0),
    in_review: Number(raw?.in_review ?? 0),
    due: Number(raw?.due ?? 0),
    due_count: Number(raw?.due_count ?? 0),
  };
  const sum = (s?: CommissionState) => rows.filter((r) => !s || r.state === s).reduce((a, r) => a + r.commission, 0);
  const paidPct = summary.generated > 0 ? Math.min(100, Math.round((summary.paid / summary.generated) * 100)) : 0;

  const history = (payments ?? []) as CommissionPayment[];
  const subHistory = (subs ?? []) as SubscriptionPayment[];
  const now = Date.now();
  const planActive = store.plan && store.plan_expires_at && new Date(store.plan_expires_at).getTime() > now;
  const inTrial = !planActive && store.trial_ends_at && new Date(store.trial_ends_at).getTime() > now;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comisiones y plan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Linki App cobra el {(Number(store.commission_rate) * 100).toLocaleString("es-VE")} % de cada venta pagada. Aquí ves lo que llevas,
          lo que pagaste y lo que te queda.
        </p>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">Resumen total</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Comisión generada" value={formatMoney(summary.generated)} />
          <StatCard label="Pagado" value={formatMoney(summary.paid)} />
          <StatCard label="En revisión" value={formatMoney(summary.in_review)} />
          <StatCard label="Te queda por pagar" value={formatMoney(summary.due)} hint={`${summary.due_count} ventas`} tone="brand" />
        </div>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Has pagado el {paidPct} % de tus comisiones.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Comisiones por venta</h2>
        <PeriodTabs current={period} basePath="/panel/comisiones" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Generada en el periodo" value={formatMoney(sum())} />
          <StatCard label="Pagada o en revisión" value={formatMoney(sum("pagada") + sum("en_revision"))} />
          <StatCard label="Por pagar" value={formatMoney(sum("por_pagar"))} />
        </div>
        <CommissionsBoard
          rows={rows}
          totalDue={summary.due}
          totalDueCount={summary.due_count}
          userId={user.id}
          rate={rate}
          methods={(settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Mis pagos de comisiones</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {history.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{formatMoney(p.amount_usd)}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(p.created_at)} · {PAYMENT_METHODS[p.method].label} · Ref. {p.reference}
                </p>
              </div>
              <PaymentStatusBadge status={p.status} />
            </li>
          ))}
          {!history.length && <li className="py-4 text-center text-slate-500">Aún no has pagado comisiones.</li>}
        </ul>
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Suscripción</h2>
            <p className="text-sm text-slate-600">
              {planActive
                ? `Plan ${PLANS[store.plan!].label} (${store.plan_cycle}) activo hasta el ${formatDate(store.plan_expires_at!, false)}.`
                : inTrial
                  ? `Prueba gratis hasta el ${formatDate(store.trial_ends_at!, false)}.`
                  : "Tu tienda no tiene un plan activo."}
            </p>
          </div>
          <Link href="/suscripcion" className="btn-primary shrink-0 px-3 py-1.5 text-sm">
            {planActive ? "Renovar" : "Pagar plan"}
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {subHistory.map((p) => (
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
          {!subHistory.length && <li className="py-4 text-center text-slate-500">Aún no hay pagos de suscripción.</li>}
        </ul>
      </section>
    </div>
  );
}
