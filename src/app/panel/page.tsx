import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { EmptyState, OrderStatusBadge, SectionHeader, StatCard } from "@/components/ui";
import { getOwnerStore } from "@/lib/auth";
import { ORDER_STATUS, PAID_STATUSES } from "@/lib/constants";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { ShareStoreWhatsApp } from "@/components/share-whatsapp";
import { formatDate, formatMoney, storeUrl } from "@/lib/utils";

export default async function PanelHome() {
  const { supabase, user, store } = await getOwnerStore();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: monthOrders }, { data: products, count: productCount }, { data: recentOrders }, { data: allStatuses }, { data: convs }] =
    await Promise.all([
      supabase.from("orders").select("total,commission,status").eq("store_id", store.id).gte("created_at", since).in("status", PAID_STATUSES),
      supabase.from("products").select("*", { count: "exact" }).eq("store_id", store.id).order("created_at", { ascending: false }).limit(6),
      supabase.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("orders").select("status").eq("store_id", store.id).gte("created_at", since),
      supabase.from("conversations").select("id,customer_name").eq("store_id", store.id),
    ]);

  const sales = monthOrders?.length ?? 0;
  const revenue = (monthOrders ?? []).reduce((a, o) => a + Number(o.total), 0);
  const commission = (monthOrders ?? []).reduce((a, o) => a + Number(o.commission), 0);
  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const convNames = new Map((convs ?? []).map((c) => [c.id, c.customer_name]));
  const { data: messages } = convs?.length
    ? await supabase
        .from("messages")
        .select("id,conversation_id,body,created_at,sender_id,read_at")
        .in("conversation_id", [...convNames.keys()])
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4)
    : { data: [] };

  return (
    <div className="space-y-8">
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Comparte tu tienda</h2>
          <p className="text-sm text-slate-600">Envía a tus contactos el link para comprar y descargar la app de {store.name}.</p>
        </div>
        <ShareStoreWhatsApp storeName={store.name} url={storeUrl(store.slug)} className="shrink-0" />
      </section>

      <section>
        <SectionHeader title="Resumen del negocio" action={<span className="text-xs text-slate-500">Últimos 30 días</span>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total ventas del último mes" value={`${sales} ventas`} tone="brand" />
          <StatCard label="Monto facturado" value={formatMoney(revenue)} />
          <Link href="/panel/comisiones" className="block transition hover:opacity-90">
            <StatCard
              label="Comisión del mes"
              value={formatMoney(commission)}
              hint={`${(Number(store.commission_rate) * 100).toFixed(1)} % Linki App · Ver y pagar`}
            />
          </Link>
        </div>
      </section>

      <section>
        <SectionHeader
          title={`Productos y servicios (${productCount ?? 0})`}
          action={
            <Link href="/panel/tienda?nuevo=1" className="btn-primary px-3 py-1.5 text-xs">
              <Plus className="size-4" /> Agregar
            </Link>
          }
        />
        {products?.length ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {(products as Product[]).map((p) => (
              <Link key={p.id} href={`/panel/tienda?editar=${p.id}`} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square w-full place-items-center bg-brand/10 text-2xl font-bold text-brand">{p.name[0]}</div>
                )}
                <div className="p-2">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatMoney(p.price)} · <span className={p.stock <= 3 ? "font-semibold text-rose-600" : ""}>{p.stock} en stock</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Aún no tienes productos" text="Agrega tu primer producto para empezar a vender." />
        )}
      </section>

      <section>
        <SectionHeader title="Gestión de pedidos" action={<Link href="/panel/pedidos" className="text-sm font-semibold text-brand">Ver todos</Link>} />
        <div className="mb-3 grid grid-cols-5 gap-2">
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 bg-white p-2 text-center">
              <p className="text-lg font-bold">{statusCounts[s] ?? 0}</p>
              <p className="truncate text-[10px] text-slate-500">{ORDER_STATUS[s].label}</p>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {(recentOrders as Order[] | null)?.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">#{o.order_number} · {o.customer_name}</p>
                <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
              </div>
              <span className="text-sm font-semibold">{formatMoney(o.total)}</span>
              <OrderStatusBadge status={o.status} />
            </li>
          ))}
          {!recentOrders?.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Sin pedidos todavía.</li>}
        </ul>
      </section>

      <section>
        <SectionHeader title="Mensajes recientes" action={<Link href="/panel/mensajes" className="text-sm font-semibold text-brand">Abrir chat</Link>} />
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {messages?.map((m) => (
            <li key={m.id}>
              <Link href={`/panel/mensajes?c=${m.conversation_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {convNames.get(m.conversation_id) ?? "Cliente"}
                    {!m.read_at && <span className="ml-2 inline-block size-2 rounded-full bg-rose-500" />}
                  </p>
                  <p className="truncate text-sm text-slate-600">{m.body}</p>
                </div>
                <span className="text-[11px] text-slate-400">{formatDate(m.created_at)}</span>
                <ChevronRight className="size-4 text-slate-400" />
              </Link>
            </li>
          ))}
          {!messages?.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No hay mensajes nuevos.</li>}
        </ul>
      </section>
    </div>
  );
}
