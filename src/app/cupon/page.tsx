import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/auth";
import { CouponForms, RedeemForm } from "./forms";

export const metadata = { title: "Entrar con cupón" };

/** Iniciar sesión o crear la cuenta con un cupón. Con sesión de tienda, solo pide el cupón. */
export default async function CouponPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { profile } = await getSession();
  const initial = ((await searchParams).codigo ?? "").slice(0, 40);
  const owner = profile?.role === "store_owner";
  return (
    <AuthShell title="Entrar con cupón" subtitle={owner ? "Escribe tu cupón para activar tu acceso." : "Escribe tu cupón y entra con tu cuenta, o crea una nueva."}>
      {owner ? <RedeemForm initial={initial} /> : <CouponForms initial={initial} />}
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿No tienes cupón?{" "}
        <Link href="/suscripcion" className="font-semibold text-brand">
          Ver planes
        </Link>
      </p>
    </AuthShell>
  );
}
