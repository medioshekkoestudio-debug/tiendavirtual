import Link from "next/link";
import { PaymentStatusBadge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { PAYMENT_METHODS, PLANS, SITE_DOMAIN } from "@/lib/constants";
import type { PaymentMethodConfig, PaymentStatus, PlanPaymentMethodKey, SubscriptionPayment } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { PlatformPaymentForm } from "./payment-form";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Planes y cobros" };

type Owner = { full_name: string | null; email: string | null; cedula: string | null; phone: string | null };
type Row = SubscriptionPayment & { stores: { name: string; slug: string; profiles: Owner | null } | null };

const FILTERS: { key: PaymentStatus | "todos"; label: string }[] = [
  { key: "pendiente", label: "Por aprobar" },
  { key: "aprobado", label: "Aprobados" },
  { key: "rechazado", label: "Rechazados" },
  { key: "todos", label: "Todos" },
];

export default async function SuperadminPlansPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { supabase, user } = await getSession();
  const { estado } = await searchParams;
  const filter = FILTERS.find((f) => f.key === estado)?.key ?? "pendiente";

  let query = supabase
    .from("subscription_payments")
    .select("*, stores(name, slug, profiles(full_name, email, cedula, phone))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "todos") query = query.eq("status", filter);
  const count = (status: PaymentStatus) =>
    supabase.from("subscription_payments").select("id", { count: "exact", head: true }).eq("status", status);

  const [{ data: settings }, { data }, pend, apr, rej] = await Promise.all([
    supabase.from("platform_settings").select("payment_methods").eq("id", 1).maybeSingle(),
    query,
    count("pendiente"),
    count("aprobado"),
    count("rechazado"),
  ]);
  const rows = (data ?? []) as Row[];
  const counts: Record<string, number | null> = { pendiente: pend.count, aprobado: apr.count, rechazado: rej.count };

  // Comprobantes en bucket privado: enlaces firmados válidos por 1 hora
  const paths = rows.map((r) => r.receipt_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("payment-receipts").createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const receiptUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden p-0">
        <div className="space-y-3 border-b px-4 py-3">
          <h2 className="text-lg font-bold">Pagos de planes</h2>
          <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/superadmin/planes?estado=${f.key}`}
                aria-current={filter === f.key ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-semibold transition",
                  filter === f.key ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {f.label}
                {f.key !== "todos" && counts[f.key] != null && <span className="ml-1.5 opacity-80">{counts[f.key]}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Tienda</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2">Método y referencia</th>
                <th className="px-4 py-2">Comprobante</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const url = r.receipt_path ? receiptUrl.get(r.receipt_path) : undefined;
                const owner = r.stores?.profiles;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.stores?.name ?? "—"}</p>
                      {r.stores && (
                        <Link href={`/${r.stores.slug}`} target="_blank" className="font-mono text-xs text-brand">
                          {SITE_DOMAIN}/{r.stores.slug}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {owner ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">{owner.full_name}</p>
                          <p>{owner.cedula}</p>
                          <p>{owner.phone}</p>
                          <p className="break-all">{owner.email}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {PLANS[r.plan].label} · {r.cycle}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.amount_usd)}</td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHODS[r.method].label}
                      <p className="font-mono text-xs text-slate-500">{r.reference}</p>
                    </td>
                    <td className="px-4 py-3">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                          Ver comprobante
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      {r.status === "pendiente" ? (
                        <ReviewButtons id={r.id} />
                      ) : (
                        <>
                          <PaymentStatusBadge status={r.status} />
                          {r.reviewed_at && <p className="mt-1 text-xs text-slate-500">{formatDate(r.reviewed_at)}</p>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    {filter === "pendiente" ? "No hay pagos por aprobar." : "No hay pagos en esta lista."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Datos de cobro de Linki App</h2>
        <p className="mb-4 text-sm text-slate-600">
          Es lo que ven quienes compran un plan. Activa los métodos, edita, agrega o elimina datos y sube la imagen o el QR de cada uno.
        </p>
        <PlatformPaymentForm
          userId={user!.id}
          initial={(settings?.payment_methods ?? {}) as Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>}
        />
      </section>
    </div>
  );
}
