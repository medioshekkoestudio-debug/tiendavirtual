import { PLANS } from "@/lib/constants";
import type { PlanKey } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const STYLE: Record<PlanKey, string> = {
  emprendedor: "bg-slate-100 text-slate-700",
  pro: "bg-brand/15 text-brand",
  business: "bg-[#004d40] text-white",
};

/** Plan de la tienda (diseño, límite de productos y comisión), con aviso si está en días gratis */
export function PlanChip({ plan, freeUntil, detail = false }: { plan: PlanKey; freeUntil?: Date | null; detail?: boolean }) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={cn("chip whitespace-nowrap font-semibold", STYLE[plan])}>{PLANS[plan].label}</span>
      {detail && (
        <span className="text-xs text-slate-500">
          {PLANS[plan].products} · comisión {(PLANS[plan].commissionRate * 100).toLocaleString("es-VE")} %
        </span>
      )}
      {freeUntil && <span className="whitespace-nowrap text-xs text-emerald-700">Sin comisión hasta {formatDate(freeUntil.toISOString(), false)}</span>}
    </span>
  );
}
