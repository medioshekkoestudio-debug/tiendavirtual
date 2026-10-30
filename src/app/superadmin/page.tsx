import Link from "next/link";
import { StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { RUBROS, SITE_DOMAIN, isRubro } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import { StoreToggle } from "./store-toggle";

type StatRow = {
  store_id: string;
  name: string;
  slug: string;
  industry: string | null;
  owner_email: string;
  is_active: boolean;
  created_at: string;
  products: number;
  sales: number;
  revenue: number;
  commission: number;
};

export default async function SuperadminHome() {
  const { supabase } = await getSession();
  const { data, error } = await supabase.rpc("superadmin_store_stats");
  const rows = (data ?? []) as StatRow[];

  const total = (k: "products" | "sales" | "revenue" | "commission") => rows.reduce((a, r) => a + Number(r[k]), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart).length;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Tiendas creadas" value={rows.length} hint={`${newThisMonth} este mes`} tone="brand" />
        <StatCard label="Ventas (pagadas)" value={total("sales")} />
        <StatCard label="Monto vendido" value={formatMoney(total("revenue"))} />
        <StatCard label="Productos cargados" value={total("products")} />
        <StatCard label="Comisión generada" value={formatMoney(total("commission"))} hint="Lo cobrado y lo adeudado, en Comisiones" />
      </div>

      <section className="card overflow-hidden p-0">
        <h2 className="border-b px-4 py-3 text-lg font-bold">Tiendas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Tienda</th>
                <th className="px-4 py-2">Dueño</th>
                <th className="px-4 py-2 text-right">Productos</th>
                <th className="px-4 py-2 text-right">Ventas</th>
                <th className="px-4 py-2 text-right">Vendido</th>
                <th className="px-4 py-2 text-right">Comisión generada</th>
                <th className="px-4 py-2">Creada</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.store_id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-slate-500">{isRubro(r.industry) ? RUBROS[r.industry].label : "Sin rubro"}</p>
                    <Link href={`/${r.slug}`} target="_blank" className="font-mono text-xs text-brand">
                      {SITE_DOMAIN}/{r.slug}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.owner_email}</td>
                  <td className="px-4 py-3 text-right">{r.products}</td>
                  <td className="px-4 py-3 text-right">{r.sales}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(r.revenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.commission)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.created_at, false)}</td>
                  <td className="px-4 py-3">
                    <StoreToggle storeId={r.store_id} active={r.is_active} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">Aún no hay tiendas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
