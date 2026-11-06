import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/auth";
import { FREE_TRIAL_DAYS, TRIAL_COUPON } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { CouponForms, RedeemForm } from "../cupon/forms";

export const metadata = { title: `Prueba gratis por ${FREE_TRIAL_DAYS} días` };

/** ¿La tienda de este dueño ya usó la prueba gratis? (la tabla de cupones solo la ve el Superadmin) */
async function trialUsed(ownerId: string) {
  const admin = createAdminClient();
  const [{ data: store }, { data: coupon }] = await Promise.all([
    admin.from("stores").select("id").eq("owner_id", ownerId).maybeSingle(),
    admin.from("coupons").select("id").ilike("code", TRIAL_COUPON).maybeSingle(),
  ]);
  if (!store || !coupon) return false;
  const { count } = await admin
    .from("coupon_redemptions")
    .select("store_id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("coupon_id", coupon.id);
  return (count ?? 0) > 0;
}

/**
 * Prueba gratis desde el banner de la landing: crea la cuenta (o entra con la suya) y la tienda queda con
 * FREE_TRIAL_DAYS días de acceso. Es el cupón TRIAL_COUPON por dentro: una vez por tienda, y al vencer el panel
 * muestra el aviso para comprar un plan (AccessGate).
 */
export default async function TrialPage() {
  const { user, profile } = await getSession();
  const owner = profile?.role === "store_owner";
  const used = owner && user ? await trialUsed(user.id) : false;

  if (used) {
    return (
      <AuthShell title="Ya usaste tu prueba gratis" subtitle="Cada tienda puede usar la prueba gratis una sola vez.">
        <div className="space-y-2">
          <Link href="/suscripcion" className="btn-primary w-full py-3 text-base">
            Ver planes
          </Link>
          <Link href="/panel" className="btn-outline w-full">
            Ir a mi panel
          </Link>
        </div>
      </AuthShell>
    );
  }

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
