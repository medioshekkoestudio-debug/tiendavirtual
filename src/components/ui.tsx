import Link from "next/link";
import { ORDER_STATUS, PAYMENT_STATUS, PERIODS, type PeriodKey } from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; tone?: "default" | "brand" }) {
  return (
    <div className={cn("rounded-2xl p-4", tone === "brand" ? "bg-brand text-on-brand" : "border border-slate-200 bg-white")}>
      <p className={cn("text-xs font-medium", tone === "brand" ? "opacity-80" : "text-slate-500")}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className={cn("mt-0.5 text-xs", tone === "brand" ? "opacity-75" : "text-slate-500")}>{hint}</p>}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold">{title}</h2>
      {action}
    </div>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={cn("chip", s.className)}>{s.label}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status];
  return <span className={cn("chip", s.className)}>{s.label}</span>;
}

/** Filtro de periodo (día/semana/mes/año) basado en query params. */
export function PeriodTabs({
  current,
  basePath,
  params = {},
}: {
  current: PeriodKey;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1">
      {(Object.keys(PERIODS) as PeriodKey[]).map((p) => {
        const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), periodo: p } as Record<string, string>);
        return (
          <Link
            key={p}
            href={`${basePath}?${q.toString()}`}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition",
              current === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {PERIODS[p]}
          </Link>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
