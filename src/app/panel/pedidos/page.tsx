import Link from "next/link";
import { CalendarClock, MapPin, Store as StoreIcon } from "lucide-react";
import { PeriodTabs, StatCard } from "@/components/ui";
import { getOwnerStore } from "@/lib/auth";
import { PERIODS } from "@/lib/constants";
import type { Category, Order, OrderItem } from "@/lib/types";
import { cn, formatDate, formatMoney, parsePeriod, periodStart } from "@/lib/utils";
import { OrderStatusSelect } from "./order-status-select";

export const metadata = { title: "Pedidos" };

type Row = Order & { order_items: OrderItem[] };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ periodo?: string; categoria?: string }> }) {
  const { supabase, store } = await getOwnerStore();
  const sp = await searchParams;
  const period = parsePeriod(sp.periodo, "dia");
  const start = periodStart(period);

  let q = supabase.from("orders").select("*, order_items(*)").eq("store_id", store.id).order("created_at", { ascending: false });
  if (start) q = q.gte("created_at", start.toISOString());
  const [{ data }, { data: cats }] = await Promise.all([q, supabase.from("categories").select("*").eq("store_id", store.id)]);
  const orders = (data ?? []) as Row[];
  const categories = (cats ?? []) as Category[];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  // Agrupar por categoría principal
  const groups = new Map<string, { name: string; orders: Set<string>; units: number; amount: number }>();
  for (const o of orders) {
    for (const it of o.order_items) {
      const key = it.category_id ?? "none";
      const g = groups.get(key) ?? { name: it.category_id ? (catName.get(it.category_id) ?? "Categoría eliminada") : "Sin categoría", orders: new Set(), units: 0, amount: 0 };
      g.orders.add(o.id);
      g.units += it.quantity;
      g.amount += it.quantity * Number(it.unit_price);
      groups.set(key, g);
    }
  }
  const selected = sp.categoria;
  const visible = selected
    ? orders.filter((o) => o.order_items.some((it) => (it.category_id ?? "none") === selected))
    : orders;
  const activeOrders = orders.filter((o) => o.status !== "cancelado");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <PeriodTabs current={period} basePath="/panel/pedidos" params={{ categoria: selected }} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={`Pedidos (${PERIODS[period].toLowerCase()})`} value={orders.length} tone="brand" />
        <StatCard label="Monto en pedidos" value={formatMoney(activeOrders.reduce((a, o) => a + Number(o.total), 0))} hint="Sin cancelados" />
      </div>

      <section>
        <h2 className="mb-2 font-bold">Por categoría</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/panel/pedidos?periodo=${period}`}
            className={cn("rounded-2xl border bg-white p-3", !selected ? "border-brand ring-2 ring-brand/20" : "border-slate-200")}
          >
            <p className="font-semibold">Todas</p>
            <p className="text-xs text-slate-500">{orders.length} pedidos</p>
          </Link>
          {[...groups.entries()].map(([key, g]) => (
            <Link
              key={key}
              href={`/panel/pedidos?periodo=${period}&categoria=${key}`}
              className={cn("rounded-2xl border bg-white p-3", selected === key ? "border-brand ring-2 ring-brand/20" : "border-slate-200")}
            >
              <p className="font-semibold">{g.name}</p>
              <p className="text-xs text-slate-500">
                {g.orders.size} pedidos · {g.units} unidades · {formatMoney(g.amount)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <ul className="space-y-3">
        {visible.map((o) => (
          <li key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">#{o.order_number} · {o.customer_name}</p>
                <p className="text-xs text-slate-500">{formatDate(o.created_at)} · {o.customer_phone}</p>
              </div>
              <OrderStatusSelect orderId={o.id} status={o.status} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {o.order_items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {it.quantity} × {it.product_name}
                    {it.category_id && <span className="ml-1 text-xs text-slate-400">({catName.get(it.category_id)})</span>}
                  </span>
                  <span className="font-medium">{formatMoney(it.quantity * Number(it.unit_price))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t pt-2 text-xs text-slate-600">
              {o.delivery_type === "envio" ? (
                <>
                  <p className="flex gap-1"><MapPin className="size-3.5 shrink-0" /> {o.shipping_address}</p>
                  {o.scheduled_for && <p className="flex gap-1"><CalendarClock className="size-3.5" /> Entrega: {formatDate(o.scheduled_for)}</p>}
                </>
              ) : (
                <p className="flex gap-1"><StoreIcon className="size-3.5" /> Compra sin envío</p>
              )}
              {o.notes && <p className="italic">“{o.notes}”</p>}
            </div>
            <p className="mt-2 text-right font-bold">{formatMoney(o.total)}</p>
          </li>
        ))}
        {!visible.length && (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            No hay pedidos en este periodo.
          </li>
        )}
      </ul>
    </div>
  );
}
