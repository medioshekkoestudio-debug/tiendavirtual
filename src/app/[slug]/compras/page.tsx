import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getStoreBySlug } from "@/lib/storefront";
import type { Order, OrderItem, Payment } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { LoginPrompt } from "../login-prompt";

export const metadata = { title: "Mis compras" };

type Row = Order & { order_items: OrderItem[]; payments: Payment[] | Payment | null };

export default async function MyPurchasesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const { supabase, user } = await getSession();
  if (!user) return <LoginPrompt slug={store.slug} next={`/${store.slug}/compras`} text="Inicia sesión para ver el historial de tus compras." />;

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .eq("store_id", store.id)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Row[];

  return (
    <div className="space-y-4 px-4 py-5">
      <h1 className="font-brand text-2xl font-bold">Mis compras</h1>
      {orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
          <p className="text-slate-500">Aún no tienes compras en {store.name}.</p>
          <Link href={`/${store.slug}`} className="btn-primary mt-4">Ver productos</Link>
        </div>
      )}
      {orders.map((o) => {
        const pay = Array.isArray(o.payments) ? o.payments[0] : o.payments;
        return (
          <article key={o.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">Pedido #{o.order_number}</p>
                <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {o.order_items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="truncate">{it.quantity} × {it.product_name}</span>
                  <span>{formatMoney(it.quantity * Number(it.unit_price))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                {pay && (
                  <>
                    {PAYMENT_METHODS[pay.method].label} <PaymentStatusBadge status={pay.status} />
                  </>
                )}
              </span>
              <span className="font-bold">{formatMoney(o.total)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {o.delivery_type === "envio" ? `Envío: ${o.shipping_address}${o.scheduled_for ? ` · ${formatDate(o.scheduled_for)}` : ""}` : "Compra sin envío"}
            </p>
          </article>
        );
      })}
    </div>
  );
}
