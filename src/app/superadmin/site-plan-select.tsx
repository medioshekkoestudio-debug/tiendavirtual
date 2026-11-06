"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PLAN_KEYS, PLANS } from "@/lib/constants";
import type { PlanKey } from "@/lib/types";
import { setStoreSitePlan } from "./actions";

/**
 * Plan de la tienda: decide el diseño de la página, el límite de productos y la comisión por venta.
 * Se cambia a mano aunque tenga cupón, prueba gratis o plan pagado (no cambia sus días de acceso).
 */
export function SitePlanSelect({ storeId, value }: { storeId: string; value: PlanKey }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="mt-1.5 block text-xs text-slate-500">
      Plan:
      <select
        className="ml-1 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800 disabled:opacity-50"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const plan = e.target.value;
          startTransition(async () => {
            const res = await setStoreSitePlan(storeId, plan);
            if (res.error) alert(res.error);
            router.refresh();
          });
        }}
      >
        {PLAN_KEYS.map((k) => (
          <option key={k} value={k}>{PLANS[k].label}</option>
        ))}
      </select>
    </label>
  );
}
