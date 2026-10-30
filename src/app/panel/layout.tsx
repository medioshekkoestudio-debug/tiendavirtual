import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { ExternalLink, LogOut, Percent, Settings } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { BottomNav } from "@/components/bottom-nav";
import { AccessGate } from "@/components/access-gate";
import { MarkHasAccount } from "@/components/account-flag";
import { InstallAppButton } from "@/components/install-app";
import { NotificationBell, PendingPlanNotice } from "@/components/notifications";
import { hasAccess, hasPendingPlanPayment } from "@/lib/access";
import type { Notification } from "@/lib/types";
import { themeStyle } from "@/components/theme-vars";
import { getOwnerStore } from "@/lib/auth";
import { SITE_DOMAIN } from "@/lib/constants";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Panel",
  manifest: "/panel/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, store } = await getOwnerStore();

  const { data: convs } = await supabase.from("conversations").select("id").eq("store_id", store.id);
  const convIds = (convs ?? []).map((c) => c.id);
  const { count: unread } = convIds.length
    ? await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .is("read_at", null)
        .neq("sender_id", user.id)
    : { count: 0 };
  const [planPending, { data: notifs }] = await Promise.all([
    hasPendingPlanPayment(supabase, store.id),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(15),
  ]);
  const access = hasAccess(store);
  const { count: pendingPayments } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "pendiente");

  return (
    <div className="font-brand min-h-dvh bg-slate-50 pb-24" style={themeStyle(store)}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" className="size-9 rounded-xl object-contain" />
          ) : (
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-on-brand">{initials(store.name)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{store.name}</p>
            <Link href={`/${store.slug}`} target="_blank" className="flex items-center gap-1 truncate text-xs text-brand">
              {SITE_DOMAIN}/{store.slug} <ExternalLink className="size-3" />
            </Link>
          </div>
          <NotificationBell items={(notifs ?? []) as Notification[]} />
          <InstallAppButton appName="Mi tienda" iconOnly />
          <Link href="/panel/comisiones" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Comisiones y plan" title="Comisiones y plan">
            <Percent className="size-5" />
          </Link>
          <Link href="/panel/ajustes" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Ajustes">
            <Settings className="size-5" />
          </Link>
          <form action={signOut}>
            <input type="hidden" name="next" value="/login" />
            <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Cerrar sesión">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>
      {!access && planPending && <PendingPlanNotice />}
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <MarkHasAccount />
      <AccessGate blocked={!access && !planPending} hadCoupon={!!store.coupon_code} />
      <BottomNav
        items={[
          { href: "/panel", label: "Inicio", icon: "home", exact: true },
          { href: "/panel/tienda", label: "Tienda", icon: "store" },
          { href: "/panel/pagos", label: "Pagos", icon: "payments", badge: pendingPayments ?? 0 },
          { href: "/panel/pedidos", label: "Pedidos", icon: "orders" },
          { href: "/panel/mensajes", label: "Mensajes", icon: "messages", badge: unread ?? 0 },
        ]}
      />
    </div>
  );
}
