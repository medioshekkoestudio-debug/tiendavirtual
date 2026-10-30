import { getSession } from "@/lib/auth";
import { CouponEditor, type CouponRow } from "./editor";

export const metadata = { title: "Cupones" };

/** Cupones de acceso: código, días de acceso y cuántas tiendas lo usaron */
export default async function CouponsPage() {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("coupons").select("id, code, free_days, active, created_at").order("created_at");
  const coupons = (data ?? []) as Omit<CouponRow, "uses">[];
  // Conteo por cupón con head+count (los agregados de PostgREST están apagados)
  const counts = await Promise.all(
    coupons.map((c) => supabase.from("coupon_redemptions").select("store_id", { count: "exact", head: true }).eq("coupon_id", c.id)),
  );
  const rows: CouponRow[] = coupons.map((c, i) => ({ ...c, uses: counts[i].count ?? 0 }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cupones</h1>
        <p className="text-sm text-slate-600">
          Con un cupón una empresa entra y usa la app los días que indiques. Al terminar, la app le pide comprar un plan.
          Cada tienda puede usar cada cupón una sola vez. Cambiar los días no afecta a quien ya lo usó.
        </p>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}
      <CouponEditor coupons={rows} />
    </div>
  );
}
