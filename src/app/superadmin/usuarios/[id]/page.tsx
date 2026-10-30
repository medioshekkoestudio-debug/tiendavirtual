import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { ACTIVITY_LABELS, SEGMENTS, screenName } from "@/lib/activity";
import { PLANS, RUBROS, SITE_DOMAIN, isPlan, isRubro } from "@/lib/constants";
import type { Profile, Store } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { StatRow } from "../../page";
import { WhatsAppUserButton } from "../../whatsapp-button";

export const metadata = { title: "Usuario" };

type Activity = { id: number; action: string; detail: Record<string, unknown>; created_at: string };

/** Lo que se muestra de cada evento, además de su nombre */
function detailText(a: Activity) {
  const d = a.detail ?? {};
  if (a.action === "visita") return screenName(String(d.path ?? ""));
  const parts: string[] = [];
  if (d.nombre) parts.push(String(d.nombre));
  if (d.precio != null) parts.push(formatMoney(Number(d.precio)));
  if (d.stock != null) parts.push(`stock ${d.stock}`);
  if (d.pedido != null) parts.push(`pedido #${d.pedido}`);
  if (d.estado) parts.push(String(d.estado));
  if (d.total != null) parts.push(formatMoney(Number(d.total)));
  if (d.monto != null) parts.push(formatMoney(Number(d.monto)));
  if (d.referencia) parts.push(`ref. ${d.referencia}`);
  if (d.cupon) parts.push(String(d.cupon));
  if (Array.isArray(d.campos)) parts.push(`(${(d.campos as string[]).join(", ")})`);
  return parts.join(" · ");
}

export default async function UserDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ver?: string }> }) {
  const { id } = await params;
  const ver = (await searchParams).ver;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await getSession();

  const { data: store } = await supabase.from("stores").select("*").eq("id", id).maybeSingle<Store>();
  if (!store) notFound();
  let activityQ = supabase.from("activity_log").select("id, action, detail, created_at").eq("store_id", id).order("created_at", { ascending: false }).limit(300);
  if (ver === "acciones") activityQ = activityQ.neq("action", "visita");
  const [{ data: owner }, { data: stats }, { data: activity }, { count: visits }, { data: subs }, { data: redemptions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", store.owner_id).maybeSingle<Profile>(),
    supabase.rpc("superadmin_store_stats"),
    activityQ,
    supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("store_id", id).eq("action", "inicio_sesion"),
    supabase.from("subscription_payments").select("plan, cycle, amount_usd, status, created_at").eq("store_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("coupon_redemptions").select("redeemed_at, access_until, coupons(code)").eq("store_id", id).order("redeemed_at", { ascending: false }),
  ]);
  const s = ((stats ?? []) as StatRow[]).find((r) => r.store_id === id);
  const segment = s?.segment ?? "sin_plan";
  const events = (activity ?? []) as Activity[];
  const now = Date.now();
  const planActive = store.plan && store.plan_expires_at && new Date(store.plan_expires_at).getTime() > now;
  const couponActive = store.trial_ends_at && new Date(store.trial_ends_at).getTime() > now;

  const data: [string, React.ReactNode][] = [
    ["Nombre", owner?.full_name || "—"],
    ["Email (usuario)", owner?.email || "—"],
    ["Teléfono", owner?.phone || "—"],
    ["Cédula / RIF", owner?.cedula || "—"],
    ["Empresa", store.name],
    ["Rubro", isRubro(store.industry) ? RUBROS[store.industry].label : "—"],
    ["Link", <Link key="l" href={`/${store.slug}`} target="_blank" className="inline-flex items-center gap-1 font-mono text-brand">{SITE_DOMAIN}/{store.slug} <ExternalLink className="size-3" /></Link>],
    ["Registrado", formatDate(store.created_at)],
    ["Configuración", store.onboarding_completed ? "Terminada" : `En el paso ${store.onboarding_step}`],
    ["Tienda", store.is_active ? "Activa" : "Desactivada"],
    [
      "Plan",
      planActive && isPlan(store.plan) ? `${PLANS[store.plan].label} (${store.plan_cycle}) hasta ${formatDate(store.plan_expires_at, false)}`
        : store.plan_expires_at ? `Vencido el ${formatDate(store.plan_expires_at, false)}` : "Nunca pagó un plan",
    ],
    ["Cupón", store.coupon_code ? `${store.coupon_code} · ${couponActive ? "vigente" : "vencido"} hasta ${formatDate(store.trial_ends_at, false)}` : "—"],
  ];

  return (
    <div className="space-y-6">
      <Link href="/superadmin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Tiendas y usuarios
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-slate-600">
            {owner?.full_name} · <span className={cn("chip", SEGMENTS[segment].className)}>{SEGMENTS[segment].label}</span>
          </p>
        </div>
        <WhatsAppUserButton phone={owner?.phone ?? null} name={owner?.full_name} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Productos" value={Number(s?.products ?? 0)} />
        <StatCard label="Ventas (pagadas)" value={Number(s?.sales ?? 0)} />
        <StatCard label="Vendido" value={formatMoney(Number(s?.revenue ?? 0))} />
        <StatCard label="Comisión generada" value={formatMoney(Number(s?.commission ?? 0))} />
        <StatCard label="Inicios de sesión" value={visits ?? 0} hint={s?.last_activity ? `Última actividad ${formatDate(s.last_activity)}` : "Sin actividad"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Datos de registro</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              {data.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="min-w-0 break-words font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Pagos de plan y cupones</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {(subs ?? []).map((p, i) => (
                <li key={i} className="flex justify-between gap-2 py-2">
                  <span>
                    Plan {isPlan(p.plan) ? PLANS[p.plan].label : p.plan} · {p.cycle} · {formatMoney(Number(p.amount_usd))}
                    <span className="block text-xs text-slate-500">{formatDate(p.created_at)}</span>
                  </span>
                  <span className="font-semibold">{p.status}</span>
                </li>
              ))}
              {(redemptions ?? []).map((r, i) => (
                <li key={`c${i}`} className="flex justify-between gap-2 py-2">
                  <span>
                    Cupón {(r.coupons as unknown as { code: string } | null)?.code}
                    <span className="block text-xs text-slate-500">{formatDate(r.redeemed_at)}</span>
                  </span>
                  <span className="text-slate-600">hasta {formatDate(r.access_until, false)}</span>
                </li>
              ))}
              {!subs?.length && !redemptions?.length && <li className="py-3 text-center text-slate-500">Sin pagos de plan ni cupones.</li>}
            </ul>
          </section>
        </div>

        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-lg font-bold">Actividad</h2>
            {(
              [
                [undefined, "Todo"],
                ["acciones", "Sin visitas a pantallas"],
              ] as const
            ).map(([k, label]) => (
              <Link
                key={label}
                href={k ? `?ver=${k}` : "?"}
                className={cn("rounded-full px-3 py-1 text-xs font-semibold", ver === k ? "bg-brand text-white" : "bg-slate-100 text-slate-600")}
              >
                {label}
              </Link>
            ))}
          </div>
          <ol className="divide-y divide-slate-100 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 py-2">
                <span className="w-28 shrink-0 text-xs text-slate-500">{formatDate(e.created_at)}</span>
                <span className="min-w-0">
                  <span className="font-semibold">{ACTIVITY_LABELS[e.action] ?? e.action}</span>
                  {detailText(e) && <span className="block break-words text-slate-600">{detailText(e)}</span>}
                </span>
              </li>
            ))}
            {!events.length && <li className="py-6 text-center text-slate-500">Aún no hay actividad registrada.</li>}
          </ol>
          {events.length === 300 && <p className="mt-2 text-xs text-slate-500">Se muestran los últimos 300 movimientos.</p>}
        </section>
      </div>
    </div>
  );
}
