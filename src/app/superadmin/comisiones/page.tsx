import Link from "next/link";
import { PaymentStatusBadge, StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { PAYMENT_METHODS, PLANS, SITE_DOMAIN, isPlan } from "@/lib/constants";
import type { CommissionPayment, PaymentStatus } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { ReviewButtons } from "../planes/review-buttons";

export const metadata = { title: "Comisiones" };

type Billing = {
  store_id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  owner_email: string | null;
  plan: string | null;
  plan_cycle: string | null;
  plan_expires_at: string | null;
  trial_ends_at: string | null;
  commission_generated: number;
  commission_paid: number;
  commission_in_review: number;
  commission_due: number;
  subscription_paid: number;
  subscription_pending: number;
  subscription_last_at: string | null;
};
type Row = CommissionPayment & { stores: { name: string; slug: string } | null; commission_payment_items: { order_id: string }[] };

const FILTERS: { key: PaymentStatus | "todos"; label: string }[] = [
  { key: "pendiente", label: "Por aprobar" },
  { key: "aprobado", label: "Aprobados" },
  { key: "rechazado", label: "Rechazados" },
  { key: "todos", label: "Todos" },
];

function planText(b: Billing) {
  const now = Date.now();
  if (b.plan && isPlan(b.plan) && b.plan_expires_at && new Date(b.plan_expires_at).getTime() > now) {
    return { label: `${PLANS[b.plan].label} · ${b.plan_cycle}`, hint: `vence ${formatDate(b.plan_expires_at, false)}`, ok: true };
  }
  if (b.trial_ends_at && new Date(b.trial_ends_at).getTime() > now) {
    return { label: "Prueba gratis", hint: `hasta ${formatDate(b.trial_ends_at, false)}`, ok: true };
  }
  return { label: "Sin plan activo", hint: b.plan_expires_at ? `venció ${formatDate(b.plan_expires_at, false)}` : "", ok: false };
}

/** Relación de cobros por tienda (comisiones y suscripción) y pagos de comisiones por aprobar. */
export default async function SuperadminCommissionsPage({ searchParams }: { searchParams: Promise<{ estado?: string; tienda?: string }> }) {
  const { supabase } = await getSession();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.estado)?.key ?? "pendiente";
  const storeFilter = sp.tienda && /^[0-9a-f-]{36}$/.test(sp.tienda) ? sp.tienda : undefined;

  let query = supabase
    .from("commission_payments")
    .select("*, stores(name, slug), commission_payment_items(order_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "todos") query = query.eq("status", filter);
  if (storeFilter) query = query.eq("store_id", storeFilter);
  const count = (status: PaymentStatus) => {
    let q = supabase.from("commission_payments").select("id", { count: "exact", head: true }).eq("status", status);
    if (storeFilter) q = q.eq("store_id", storeFilter);
    return q;
  };

  const [{ data: billingData, error }, { data }, pend, apr, rej] = await Promise.all([
    supabase.rpc("superadmin_billing"),
    query,
    count("pendiente"),
    count("aprobado"),
    count("rechazado"),
  ]);
  const billing = ((billingData ?? []) as Billing[]).map((b) => ({
    ...b,
    commission_generated: Number(b.commission_generated),
    commission_paid: Number(b.commission_paid),
    commission_in_review: Number(b.commission_in_review),
    commission_due: Number(b.commission_due),
    subscription_paid: Number(b.subscription_paid),
    subscription_pending: Number(b.subscription_pending),
  }));
  const rows = (data ?? []) as Row[];
  const counts: Record<string, number | null> = { pendiente: pend.count, aprobado: apr.count, rechazado: rej.count };
  const total = (k: keyof Billing) => billing.reduce((a, b) => a + Number(b[k]), 0);
  const selectedStore = storeFilter ? billing.find((b) => b.store_id === storeFilter) : undefined;

  const paths = rows.map((r) => r.receipt_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("payment-receipts").createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const receiptUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const href = (patch: { estado?: string; tienda?: string | null }) => {
    const q = new URLSearchParams();
    q.set("estado", patch.estado ?? filter);
    const t = patch.tienda === null ? undefined : (patch.tienda ?? storeFilter);
    if (t) q.set("tienda", t);
    return `/superadmin/comisiones?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Comisión generada" value={formatMoney(total("commission_generated"))} />
        <StatCard label="Comisión cobrada" value={formatMoney(total("commission_paid"))} />
        <StatCard label="En revisión" value={formatMoney(total("commission_in_review"))} />
        <StatCard label="Comisión por cobrar" value={formatMoney(total("commission_due"))} tone="brand" />
        <StatCard label="Suscripciones cobradas" value={formatMoney(total("subscription_paid"))} hint={`${formatMoney(total("subscription_pending"))} por aprobar`} />
      </div>

      <section className="card overflow-hidden p-0">
        <div className="space-y-3 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Pagos de comisiones</h2>
            {selectedStore && (
              <Link href={href({ tienda: null })} className="chip bg-slate-100 text-slate-700">
                {selectedStore.name} ✕
              </Link>
            )}
          </div>
          <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={href({ estado: f.key })}
                aria-current={filter === f.key ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-semibold transition",
                  filter === f.key ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {f.label}
                {f.key !== "todos" && counts[f.key] != null && <span className="ml-1.5 opacity-80">{counts[f.key]}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Tienda</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-right">Ventas</th>
                <th className="px-4 py-2">Método y referencia</th>
                <th className="px-4 py-2">Comprobante</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const url = r.receipt_path ? receiptUrl.get(r.receipt_path) : undefined;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.stores?.name ?? "—"}</p>
                      {r.stores && <p className="font-mono text-xs text-slate-500">{SITE_DOMAIN}/{r.stores.slug}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.amount_usd)}</td>
                    <td className="px-4 py-3 text-right">{r.commission_payment_items.length}</td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHODS[r.method].label}
                      <p className="font-mono text-xs text-slate-500">{r.reference}</p>
                    </td>
                    <td className="px-4 py-3">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                          Ver comprobante
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      {r.status === "pendiente" ? (
                        <ReviewButtons id={r.id} kind="comision" />
                      ) : (
                        <>
                          <PaymentStatusBadge status={r.status} />
                          {r.reviewed_at && <p className="mt-1 text-xs text-slate-500">{formatDate(r.reviewed_at)}</p>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    {filter === "pendiente" ? "No hay pagos de comisiones por aprobar." : "No hay pagos en esta lista."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-bold">Relación por tienda</h2>
          <p className="text-sm text-slate-600">Comisiones generadas, pagadas y adeudadas, y lo cobrado por suscripción de cada tienda.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Tienda</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2 text-right">Suscripción pagada</th>
                <th className="px-4 py-2 text-right">Comisión generada</th>
                <th className="px-4 py-2 text-right">Pagada</th>
                <th className="px-4 py-2 text-right">En revisión</th>
                <th className="px-4 py-2 text-right">Por cobrar</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billing.map((b) => {
                const p = planText(b);
                return (
                  <tr key={b.store_id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.owner_name}</p>
                      <p className="break-all text-xs text-slate-500">{b.owner_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={cn("font-semibold", !p.ok && "text-rose-600")}>{p.label}</p>
                      {p.hint && <p className="text-xs text-slate-500">{p.hint}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(b.subscription_paid)}
                      {b.subscription_pending > 0 && <p className="text-xs text-amber-700">{formatMoney(b.subscription_pending)} por aprobar</p>}
                      {b.subscription_last_at && <p className="text-xs text-slate-500">último {formatDate(b.subscription_last_at, false)}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(b.commission_generated)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatMoney(b.commission_paid)}</td>
                    <td className="px-4 py-3 text-right text-sky-700">{formatMoney(b.commission_in_review)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMoney(b.commission_due)}</td>
                    <td className="px-4 py-3">
                      <Link href={href({ estado: "todos", tienda: b.store_id })} className="whitespace-nowrap text-xs font-semibold text-brand">
                        Ver pagos
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!billing.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">Aún no hay tiendas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
