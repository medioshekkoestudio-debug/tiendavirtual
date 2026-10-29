import { cn, formatBs, formatDate, formatMoney, toBs } from "@/lib/utils";

export type Rate = { rate: number; date: string } | null;

/** Monto en dólares con su equivalente en bolívares debajo (si hay tasa BCV). */
export function Money({
  usd,
  rate,
  className,
  bsClassName,
}: {
  usd: number;
  rate: Rate;
  className?: string;
  bsClassName?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span>{formatMoney(usd)}</span>
      {rate && <span className={cn("text-xs font-medium text-slate-500", bsClassName)}>{formatBs(toBs(usd, rate.rate))}</span>}
    </span>
  );
}

/** «Tasa BCV del 29-10-2026: Bs. 215,40 por $», o el aviso si no hay tasa. */
export function RateNote({ rate, className }: { rate: Rate; className?: string }) {
  return (
    <p className={cn("text-xs text-slate-500", className)}>
      {rate
        ? `Tasa BCV del ${formatDate(rate.date + "T12:00:00", false)}: ${formatBs(rate.rate)} por $`
        : "Tasa BCV no disponible en este momento: el monto en bolívares se calcula al pagar."}
    </p>
  );
}
