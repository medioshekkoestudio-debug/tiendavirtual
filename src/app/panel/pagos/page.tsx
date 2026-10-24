import Link from "next/link";
import { ArrowDownUp } from "lucide-react";
import { PaymentStatusBadge, PeriodTabs, StatCard } from "@/components/ui";
import { getOwnerStore } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/constants";
import type { Order, Payment, PaymentStatus } from "@/lib/types";
import { cn, formatDate, formatMoney, parsePeriod, periodStart } from "@/lib/utils";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Pagos" };

type Row = Payment & { orders: Pick<Order, "order_number" | "customer_name" | "customer_phone" | "customer_cedula"> | null };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; orden?: string; estado?: string }>;
}) {
  const { supabase, store } = await getOwnerStore();
  const sp = await searchParams;
  const period = parsePeriod(sp.periodo, "mes");
  const order = sp.orden === "antiguo" ? "antiguo" : "reciente";
  const estado = (["pendiente", "aprobado", "rechazado"] as const).find((s) => s === sp.estado);
  const start = periodStart(period);

  let q = supabase
    .from("payments")
    .select("*, orders(order_number, customer_name, customer_phone, customer_cedula)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: order === "antiguo" });
  if (start) q = q.gte("created_at", start.toISOString());
  const { data } = await q;
  const all = (data ?? []) as Row[];
  const rows = estado ? all.filter((p) => p.status === estado) : all;

  const count = (s: PaymentStatus) => all.filter((p) => p.status === s).length;
  const sum = (s: PaymentStatus) => all.filter((p) => p.status === s).reduce((a, p) => a + Number(p.amount), 0);
  const base = { periodo: period, orden: order, estado };
  const href = (patch: Record<string, string | undefined>) =>
    `/panel/pagos?${new URLSearchParams(Object.entries({ ...base, ...patch }).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Pagos</h1>
      <PeriodTabs current={period} basePath="/panel/pagos" params={{ orden: order, estado }} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Compras completadas" value={count("aprobado")} hint={formatMoney(sum("aprobado"))} tone="brand" />
        <StatCard label="Pagos pendientes" value={count("pendiente")} hint={formatMoney(sum("pendiente"))} />
        <StatCard label="Aprobados" value={count("aprobado")} />
        <StatCard label="Rechazados" value={count("rechazado")} hint={formatMoney(sum("rechazado"))} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[undefined, "pendiente", "aprobado", "rechazado"].map((s) => (
          <Link
            key={s ?? "todos"}
            href={href({ estado: s })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium",
              estado === s ? "border-brand bg-brand text-on-brand" : "border-slate-200 bg-white text-slate-700",
            )}
          >
            {s ? PAYMENT_STATUS[s as PaymentStatus].label : "Todos"}
          </Link>
        ))}
        <Link href={href({ orden: order === "reciente" ? "antiguo" : "reciente" })} className="btn-outline ml-auto px-3 py-1.5 text-xs">
          <ArrowDownUp className="size-4" /> {order === "reciente" ? "Más reciente primero" : "Más antiguo primero"}
        </Link>
      </div>

      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  Pedido #{p.orders?.order_number} · {p.orders?.customer_name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(p.created_at)} · C.I. {p.orders?.customer_cedula} · {p.orders?.customer_phone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatMoney(p.amount)}</p>
                <PaymentStatusBadge status={p.status} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="chip bg-slate-100 text-slate-700">{PAYMENT_METHODS[p.method].label}</span>
              <span className="text-slate-600">
                Ref: <span className="font-mono font-semibold">{p.reference}</span>
              </span>
              {p.reviewed_at && <span className="text-xs text-slate-400">Revisado {formatDate(p.reviewed_at)}</span>}
            </div>
            {p.status === "pendiente" && <ReviewButtons paymentId={p.id} />}
          </li>
        ))}
        {!rows.length && (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            No hay pagos en este periodo.
          </li>
        )}
      </ul>
    </div>
  );
}
