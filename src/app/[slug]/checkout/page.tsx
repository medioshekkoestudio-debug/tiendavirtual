import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBcvRate } from "@/lib/exchange-rate";
import { getStoreBySlug } from "@/lib/storefront";
import { Checkout } from "./checkout";

export const metadata = { title: "Carrito y pago" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const [{ profile }, rate] = await Promise.all([getSession(), getBcvRate()]);

  return (
    <Checkout
      storeId={store.id}
      slug={store.slug}
      paymentMethods={store.payment_methods}
      rate={rate}
      profile={profile ? { name: profile.full_name ?? "", email: profile.email ?? "", phone: profile.phone ?? "", cedula: profile.cedula ?? "" } : null}
    />
  );
}
