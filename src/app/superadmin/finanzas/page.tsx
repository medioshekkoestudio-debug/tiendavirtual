import Link from "next/link";
import { PaymentStatusBadge, StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { PAYMENT_METHODS, PLAN_KEYS, PLAN_PAYMENT_METHOD_KEYS, PLANS, isPlan } from "@/lib/constants";
import type { PaymentStatus, PlanPaymentMethodKey } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Finanzas" };

type Summary = { kind: "mensualidad" | "comision"; method: PlanPaymentMethodKey; plan: string | null; cycle: string | null; status: PaymentStatus; payments: number; total: number };
type Billing = { store_id: string; name: string; slug: string; plan: string | null; plan_cycle: string | null; plan_expires_at: string | null; commission_in_review: number; commission_due: number };
type Movement = {
  id: string;
  kind: "mensualidad" | "comision";
  store: { name: string; slug: string } | null;
  store_id: string;
  plan?: string;
  cycle?: string;
  method: PlanPaymentMethodKey;
  reference: string;
  amount_usd: number;
  status: PaymentStatus;
  created_at: string;
};

const KINDS = { mensualidad: "Mensualidad", comision: "Comisión" } as const;
const STATUSES: PaymentStatus[] = ["aprobado", "pendiente", "rechazado"];

/** Todo lo que cobra Linki App: mensualidades y comisiones, dónde entró cada pago y lo que falta por cobrar. */
export default async function SuperadminFinancePage({ searchParams }: { searchParams: Promise<{ metodo?: string; tipo?: string; estado?: string }> }) {
  const { supabase } = await getSession();
  const sp = await searchParams;
  const method = PLAN_PAYMENT_METHOD_KEYS.find((m) => m === sp.metodo);
  const kind = sp.tipo === "mensualidad" || sp.tipo === "comision" ? sp.tipo : undefined;
  const status = STATUSES.find((s) => s === sp.estado);

  let subsQ = supabase
    .from("subscription_payments")
    .select("id, store_id, plan, cycle, method, reference, amount_usd, status, created_at, stores(name, slug)")
    .order("created_at", { ascending: false })
    .limit(300);
  let comQ = supabase
    .from("commission_payments")
    .select("id, store_id, method, reference, amount_usd, status, created_at, stores(name, slug)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (method) {
    subsQ = subsQ.eq("method", method);
    comQ = comQ.eq("method", method);
  }
  if (status) {
    subsQ = subsQ.eq("status", status);
    comQ = comQ.eq("status", status);
  }

  const [{ data: summaryData, error }, { data: billingData }, { data: settings }, { data: subs }, { data: coms }] = await Promise.all([
    supabase.rpc("superadmin_finance_summary"),
    supabase.rpc("superadmin_billing"),
    supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle(),
    kind === "comision" ? Promise.resolve({ data: [] }) : subsQ,
    kind === "mensualidad" ? Promise.resolve({ data: [] }) : comQ,
  ]);

  const summary = ((summaryData ?? []) as Summary[]).map((r) => ({ ...r, payments: Number(r.payments), total: Number(r.total) }));
  const billing = ((billingData ?? []) as Billing[]).map((b) => ({ ...b, commission_in_review: Number(b.commission_in_review), commission_due: Number(b.commission_due) }));
  const sum = (f: (r: Summary) => boolean) => summary.filter(f).reduce((a, r) => a + r.total, 0);
  const count = (f: (r: Summary) => boolean) => summary.filter(f).reduce((a, r) => a + r.payments, 0);
  const approved = (r: Summary) => r.status === "aprobado";

  const subsPaid = sum((r) => approved(r) && r.kind === "mensualidad");
  const comPaid = sum((r) => approved(r) && r.kind === "comision");
  const subsInReview = sum((r) => r.status === "pendiente" && r.kind === "mensualidad");
  const comInReview = billing.reduce((a, b) => a + b.commission_in_review, 0);
  const comDue = billing.reduce((a, b) => a + b.commission_due, 0);
  const now = Date.now();
  const expired = billing
    .filter((b) => b.plan && b.plan_expires_at && new Date(b.plan_expires_at).getTime() < now)
    .sort((a, b) => b.plan_expires_at!.localeCompare(a.plan_expires_at!));
  const owing = billing.filter((b) => b.commission_due > 0).sort((a, b) => b.commission_due - a.commission_due);

  // Datos de cada cuenta de cobro (para decir a qué banco o usuario entró el dinero)
  // Los datos de cada método se guardan como texto libre en `details`: se muestra su primera línea
  const accounts = (settings?.payment_methods ?? {}) as Record<string, { details?: string } | undefined>;
  const accountName = (m: PlanPaymentMethodKey) => {
    const line = (accounts[m]?.details ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    return line.length > 60 ? `${line.slice(0, 60)}…` : line || "Sin datos configurados";
  };

  type Raw = Omit<Movement, "kind" | "store"> & { stores: Movement["store"] };
  const toMovement = (k: Movement["kind"]) => ({ stores, ...r }: Raw): Movement => ({ ...r, kind: k, store: stores, amount_usd: Number(r.amount_usd) });
  const movements = [
    ...((subs ?? []) as unknown as Raw[]).map(toMovement("mensualidad")),
    ...((coms ?? []) as unknown as Raw[]).map(toMovement("comision")),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 300);

  const href = (patch: { metodo?: string | null; tipo?: string | null; estado?: string | null }) => {
    const q = new URLSearchParams();
    const m = patch.metodo === null ? undefined : (patch.metodo ?? method);
    const t = patch.tipo === null ? undefined : (patch.tipo ?? kind);
    const e = patch.estado === null ? undefined : (patch.estado ?? status);
    if (m) q.set("metodo", m);
    if (t) q.set("tipo", t);
    if (e) q.set("estado", e);
    const s = q.toString();
    return `/superadmin/finanzas${s ? `?${s}` : ""}#movimientos`;
  };
  const Chip = ({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) => (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={cn("rounded-full px-3 py-1 text-sm font-medium transition", active ? "bg-brand text-on-brand" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
    >
      {children}
    </Link>
  );

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total cobrado" value={formatMoney(subsPaid + comPaid)} hint="Mensualidades + comisiones aprobadas" tone="brand" />
        <StatCard label="Mensualidades cobradas" value={formatMoney(subsPaid)} hint={`${count((r) => approved(r) && r.kind === "mensualidad")} pagos`} />
        <StatCard label="Comisiones cobradas" value={formatMoney(comPaid)} hint={`${count((r) => approved(r) && r.kind === "comision")} pagos`} />
        <StatCard label="Por cobrar" value={formatMoney(subsInReview + comInReview + comDue)} hint="En revisión + comisiones adeudadas" />
      </div>

      {/* Dónde está el dinero */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Dónde está el dinero</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PLAN_PAYMENT_METHOD_KEYS.map((m) => {
            const ofMethod = (r: Summary) => approved(r) && r.method === m;
            return (
              <Link key={m} href={href({ metodo: method === m ? null : m })} className={cn("card block p-4 transition hover:shadow-md", method === m && "ring-2 ring-brand")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{PAYMENT_METHODS[m].label}</p>
                    <p className="text-xs text-slate-500">{accountName(m)}</p>
                  </div>
                  <span className="text-2xl font-extrabold">{formatMoney(sum(ofMethod))}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-slate-500">Mensualidades</dt>
                  <dd className="text-right font-semibold">{formatMoney(sum((r) => ofMethod(r) && r.kind === "mensualidad"))}</dd>
                  <dt className="text-slate-500">Comisiones</dt>
                  <dd className="text-right font-semibold">{formatMoney(sum((r) => ofMethod(r) && r.kind === "comision"))}</dd>
                  <dt className="text-slate-500">Pagos recibidos</dt>
                  <dd className="text-right font-semibold">{count(ofMethod)}</dd>
                  <dt className="text-slate-500">En revisión</dt>
                  <dd className="text-right font-semibold">{formatMoney(sum((r) => r.status === "pendiente" && r.method === m))}</dd>
                </dl>
                <p className="mt-2 text-xs text-brand">{method === m ? "Quitar filtro" : "Ver sus pagos"}</p>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">Montos en dólares según el plan o la comisión; los pagos por Pago móvil entran en bolívares a la tasa del día.</p>
      </section>

      {/* Mensualidades por plan */}
      <section className="card overflow-hidden p-0">
        <h2 className="border-b px-4 py-3 text-lg font-bold">Mensualidades por plan</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2 text-right">Mensual</th>
                <th className="px-4 py-2 text-right">Anual</th>
                <th className="px-4 py-2 text-right">Pagos</th>
                <th className="px-4 py-2 text-right">Total cobrado</th>
                <th className="px-4 py-2 text-right">En revisión</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PLAN_KEYS.map((p) => {
                const ofPlan = (r: Summary) => r.kind === "mensualidad" && r.plan === p;
                return (
                  <tr key={p}>
                    <td className="px-4 py-3 font-semibold">{PLANS[p].label}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(sum((r) => ofPlan(r) && approved(r) && r.cycle === "mensual"))}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(sum((r) => ofPlan(r) && approved(r) && r.cycle === "anual"))}</td>
                    <td className="px-4 py-3 text-right">{count((r) => ofPlan(r) && approved(r))}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMoney(sum((r) => ofPlan(r) && approved(r)))}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatMoney(sum((r) => ofPlan(r) && r.status === "pendiente"))}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-bold">
                <td className="px-4 py-3">Todos los planes</td>
                <td className="px-4 py-3 text-right">{formatMoney(sum((r) => r.kind === "mensualidad" && approved(r) && r.cycle === "mensual"))}</td>
                <td className="px-4 py-3 text-right">{formatMoney(sum((r) => r.kind === "mensualidad" && approved(r) && r.cycle === "anual"))}</td>
                <td className="px-4 py-3 text-right">{count((r) => r.kind === "mensualidad" && approved(r))}</td>
                <td className="px-4 py-3 text-right">{formatMoney(subsPaid)}</td>
                <td className="px-4 py-3 text-right">{formatMoney(subsInReview)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Lo que falta por cobrar */}
      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-bold">Comisiones por cobrar</h2>
            <p className="text-sm text-slate-500">
              {formatMoney(comDue)} adeudado · {formatMoney(comInReview)} en revisión
            </p>
          </div>
          {owing.length ? (
            <ul className="divide-y text-sm">
              {owing.map((b) => (
                <li key={b.store_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link href={`/superadmin/usuarios/${b.store_id}`} className="font-medium hover:text-brand">{b.name}</Link>
                  <span className="font-bold">{formatMoney(b.commission_due)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Ninguna tienda debe comisiones.</p>
          )}
        </div>
        <div className="card p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-bold">Mensualidades vencidas</h2>
            <p className="text-sm text-slate-500">Tiendas con un plan que venció y no han renovado · {formatMoney(subsInReview)} en revisión</p>
          </div>
          {expired.length ? (
            <ul className="divide-y text-sm">
              {expired.map((b) => (
                <li key={b.store_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>
                    <Link href={`/superadmin/usuarios/${b.store_id}`} className="font-medium hover:text-brand">{b.name}</Link>
                    <span className="block text-xs text-slate-500">
                      {b.plan && isPlan(b.plan) ? PLANS[b.plan].label : b.plan} · {b.plan_cycle}
                    </span>
                  </span>
                  <span className="text-slate-500">venció {formatDate(b.plan_expires_at, false)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No hay planes vencidos.</p>
          )}
        </div>
      </section>

      {/* Cada pago: quién, cuánto y a dónde */}
      <section id="movimientos" className="card overflow-hidden p-0">
        <div className="space-y-3 border-b px-4 py-3">
          <h2 className="text-lg font-bold">Todos los pagos</h2>
          <div className="flex flex-wrap gap-1.5">
            <Chip to={href({ tipo: null })} active={!kind}>Todo</Chip>
            <Chip to={href({ tipo: "mensualidad" })} active={kind === "mensualidad"}>Mensualidades</Chip>
            <Chip to={href({ tipo: "comision" })} active={kind === "comision"}>Comisiones</Chip>
            <span className="mx-1 w-px bg-slate-200" />
            <Chip to={href({ metodo: null })} active={!method}>Todos los métodos</Chip>
            {PLAN_PAYMENT_METHOD_KEYS.map((m) => (
              <Chip key={m} to={href({ metodo: m })} active={method === m}>{PAYMENT_METHODS[m].label}</Chip>
            ))}
            <span className="mx-1 w-px bg-slate-200" />
            <Chip to={href({ estado: null })} active={!status}>Cualquier estado</Chip>
            <Chip to={href({ estado: "aprobado" })} active={status === "aprobado"}>Aprobados</Chip>
            <Chip to={href({ estado: "pendiente" })} active={status === "pendiente"}>Por aprobar</Chip>
            <Chip to={href({ estado: "rechazado" })} active={status === "rechazado"}>Rechazados</Chip>
          </div>
        </div>
        {movements.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Tienda</th>
                  <th className="px-4 py-2">Concepto</th>
                  <th className="px-4 py-2">Pagó a</th>
                  <th className="px-4 py-2">Referencia</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => (
                  <tr key={`${m.kind}-${m.id}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/usuarios/${m.store_id}`} className="font-medium hover:text-brand">{m.store?.name ?? "Tienda eliminada"}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {KINDS[m.kind]}
                      {m.plan && <span className="block text-xs text-slate-500">{isPlan(m.plan) ? PLANS[m.plan].label : m.plan} · {m.cycle}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHODS[m.method]?.label ?? m.method}
                      <span className="block text-xs text-slate-500">{accountName(m.method)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.reference || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMoney(m.amount_usd)}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No hay pagos con estos filtros.</p>
        )}
      </section>
    </div>
  );
}
