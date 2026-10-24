import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStoreBySlug } from "@/lib/storefront";
import { CustomerAuth } from "./customer-auth";

export const metadata = { title: "Iniciar sesión" };

export default async function StoreLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string; modo?: string }>;
}) {
  const { slug } = await params;
  const { next, modo } = await searchParams;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const { user } = await getSession();
  if (user) redirect(`/${store.slug}/compras`);

  return (
    <div className="px-4 py-8">
      <div className="card mx-auto max-w-md p-6">
        <CustomerAuth slug={store.slug} storeName={store.name} next={next ?? ""} initialMode={modo === "registro" ? "registro" : "login"} />
      </div>
    </div>
  );
}
