import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/auth";
import { FREE_TRIAL_DAYS } from "@/lib/constants";
import { CouponForms, RedeemForm } from "../cupon/forms";

export const metadata = { title: `Prueba gratis por ${FREE_TRIAL_DAYS} días` };

/**
 * Prueba gratis desde el banner de la landing: crea la cuenta (o entra con la suya) y la tienda queda con
 * FREE_TRIAL_DAYS días de acceso. Es el cupón TRIAL_COUPON por dentro: una vez por tienda, y al vencer el panel
 * muestra el aviso para comprar un plan (AccessGate).
 */
export default async function TrialPage() {
  const { profile } = await getSession();
  const owner = profile?.role === "store_owner";
  return (
    <AuthShell
      title={`Prueba gratis por ${FREE_TRIAL_DAYS} días`}
      subtitle={
        owner
          ? `Activa tus ${FREE_TRIAL_DAYS} días gratis para usar tu app.`
          : `Crea tu tienda y úsala gratis ${FREE_TRIAL_DAYS} días. Sin pagar nada ahora.`
      }
    >
      {owner ? <RedeemForm initial="" trial /> : <CouponForms initial="" trial />}
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Prefieres un plan?{" "}
        <Link href="/suscripcion" className="font-semibold text-brand">
          Ver planes
        </Link>
      </p>
    </AuthShell>
  );
}
