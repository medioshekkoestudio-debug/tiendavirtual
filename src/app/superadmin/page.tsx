import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { SEGMENTS, type Segment } from "@/lib/activity";
import { RUBROS, SITE_DOMAIN, isRubro } from "@/lib/constants";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { StoreToggle } from "./store-toggle";
import { WhatsAppUserButton } from "./whatsapp-button";

export type StatRow = {
  store_id: string;
  name: string;
  slug: string;
  industry: string | null;
  owner_email: string;
  owner_name: string | null;
  owner_phone: string | null;
  is_active: boolean;
  created_at: string;
  segment: Segment;
  plan: string | null;
  plan_expires_at: string | null;
  coupon_code: string | null;
  trial_ends_at: string | null;
  products: number;
  sales: number;
  revenue: number;
  commission: number;
  last_activity: string | null;
};

const ORDER: Segment[] = ["suscripcion", "cupon", "sin_plan"];

/** Fecha de calendario en Venezuela (YYYY-MM-DD) desplazada `days` días; el servidor corre en UTC */
const caracasDay = (d: Date, days = 0) =>
  new Date(d.getTime() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

/** Cuenta registros de hoy, esta semana (desde el lunes) y este mes, y los del período anterior */
function signupPeriods(dates: string[]) {
  const now = new Date();
  const today = caracasDay(now);
  const weekday = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7; // lunes = 0
  const weekStart = caracasDay(now, -weekday);
  const prevWeekStart = caracasDay(now, -weekday - 7);
  const monthStart = today.slice(0, 8) + "01";
  const prevMonth = new Date(today.slice(0, 8) + "01T12:00:00Z");
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  const prevMonthStart = prevMonth.toISOString().slice(0, 10);
  const days = dates.map((d) => caracasDay(new Date(d)));
  const count = (from: string, to: string) => days.filter((d) => d >= from && d < to).length;
  const tomorrow = caracasDay(now, 1);
  return [
    { label: "hoy", now: count(today, tomorrow), prevLabel: "Ayer", prev: count(caracasDay(now, -1), today) },
    { label: "esta semana", now: count(weekStart, tomorrow), prevLabel: "Semana pasada", prev: count(prevWeekStart, weekStart) },
    { label: "este mes", now: count(monthStart, tomorrow), prevLabel: "Mes pasado", prev: count(prevMonthStart, monthStart) },
  ];
}
type Key = "products" | "sales" | "revenue" | "commission";

export default async function SuperadminHome({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { supabase } = await getSession();
  const tipo = (await searchParams).tipo;
  const filter = ORDER.find((s) => s === tipo);
  const { data, error } = await supabase.rpc("superadmin_store_stats");
  const all = ((data ?? []) as StatRow[]).map((r) => ({
    ...r,
    segment: (ORDER.includes(r.segment) ? r.segment : "sin_plan") as Segment,
    products: Number(r.products),
    sales: Number(r.sales),
    revenue: Number(r.revenue),
    commission: Number(r.commission),
  }));
  const rows = filter ? all.filter((r) => r.segment === filter) : all;

  const sum = (list: typeof all, k: Key) => list.reduce((a, r) => a + r[k], 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = all.filter((r) => new Date(r.created_at) >= monthStart).length;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Tiendas creadas" value={all.length} hint={`${newThisMonth} este mes`} tone="brand" />
        <StatCard label="Ventas (pagadas)" value={sum(all, "sales")} />
        <StatCard label="Monto vendido" value={formatMoney(sum(all, "revenue"))} />
        <StatCard label="Productos cargados" value={sum(all, "products")} />
        <StatCard label="Comisión generada" value={formatMoney(sum(all, "commission"))} hint="Lo cobrado y lo adeudado, en Comisiones" />
      </div>

      {/* Registros de tiendas por día, semana y mes (hora de Venezuela), contra el período anterior */}
      <section className="grid grid-cols-3 gap-3">
        {signupPeriods(all.map((r) => r.created_at)).map((p) => (
          <StatCard key={p.label} label={`Registros ${p.label}`} value={p.now} hint={`${p.prevLabel}: ${p.prev}`} />
        ))}
      </section>

      {/* Las mismas cifras divididas por tipo de usuario */}
      <section className="grid gap-3 md:grid-cols-3">
        {ORDER.map((seg) => {
          const list = all.filter((r) => r.segment === seg);
          return (
            <Link
              key={seg}
              href={filter === seg ? "/superadmin" : `/superadmin?tipo=${seg}`}
              className={cn("card block p-4 transition hover:shadow-md", filter === seg && "ring-2 ring-brand")}
            >
              <div className="flex items-center justify-between">
                <span className={cn("chip", SEGMENTS[seg].className)}>{SEGMENTS[seg].label}</span>
                <span className="text-2xl font-extrabold">{list.length}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Ventas</dt>
                <dd className="text-right font-semibold">{sum(list, "sales")}</dd>
                <dt className="text-slate-500">Vendido</dt>
                <dd className="text-right font-semibold">{formatMoney(sum(list, "revenue"))}</dd>
                <dt className="text-slate-500">Comisión</dt>
                <dd className="text-right font-semibold">{formatMoney(sum(list, "commission"))}</dd>
                <dt className="text-slate-500">Productos</dt>
                <dd className="text-right font-semibold">{sum(list, "products")}</dd>
              </dl>
              <p className="mt-2 text-xs text-brand">{filter === seg ? "Ver todas las tiendas" : "Ver solo estas tiendas"}</p>
            </Link>
          );
        })}
      </section>

      <section className="card overflow-hidden p-0">
        <h2 className="border-b px-4 py-3 text-lg font-bold">
          {filter ? `Tiendas con ${SEGMENTS[filter].label.toLowerCase()}` : "Tiendas y usuarios"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Tienda</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Productos</th>
                <th className="px-4 py-2 text-right">Ventas</th>
                <th className="px-4 py-2 text-right">Vendido</th>
                <th className="px-4 py-2 text-right">Comisión</th>
                <th className="px-4 py-2">Última actividad</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.store_id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/usuarios/${r.store_id}`} className="font-semibold hover:text-brand">
                      {r.name}
                    </Link>
                    <p className="text-xs text-slate-500">{isRubro(r.industry) ? RUBROS[r.industry].label : "Sin rubro"}</p>
                    <Link href={`/${r.slug}`} target="_blank" className="font-mono text-xs text-brand">
                      {SITE_DOMAIN}/{r.slug}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.owner_name}</p>
                    <p className="break-all text-xs text-slate-500">{r.owner_email}</p>
                    <div className="mt-1.5">
                      <WhatsAppUserButton phone={r.owner_phone} name={r.owner_name} compact />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("chip whitespace-nowrap", SEGMENTS[r.segment].className)}>{SEGMENTS[r.segment].label}</span>
                    {r.segment === "cupon" && r.coupon_code && <p className="mt-1 font-mono text-xs text-slate-500">{r.coupon_code}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{r.products}</td>
                  <td className="px-4 py-3 text-right">{r.sales}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(r.revenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.commission)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.last_activity ? formatDate(r.last_activity) : "—"}</td>
                  <td className="px-4 py-3">
                    <StoreToggle storeId={r.store_id} active={r.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/usuarios/${r.store_id}`} className="flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-brand">
                      Ver usuario <ChevronRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">Aún no hay tiendas en esta lista.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
