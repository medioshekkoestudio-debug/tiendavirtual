"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, MessageCircle, Package, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { home: Home, store: Store, payments: CreditCard, orders: Package, messages: MessageCircle, bag: ShoppingBag };
export type NavIcon = keyof typeof ICONS;

type NavItem = { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean };

const isActive = (it: NavItem, pathname: string) =>
  it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");

/** Menú inferior. Con `side`, en escritorio (lg) se cambia por un menú lateral fijo a la izquierda. */
export function BottomNav({ items, side = false }: { items: NavItem[]; side?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {side && (
        <nav className="fixed bottom-0 left-0 top-[57px] z-20 hidden w-56 border-r border-slate-200 bg-white p-3 lg:block">
          <ul className="space-y-1">
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      isActive(it, pathname) ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{it.label}</span>
                    {!!it.badge && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                        {it.badge > 9 ? "9+" : it.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <nav className={cn("pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur", side && "lg:hidden")}>
        <ul className="mx-auto flex max-w-3xl">
          {items.map((it) => {
            const Icon = ICONS[it.icon];
            const active = isActive(it, pathname);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition",
                    active ? "text-brand" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <span className={cn("rounded-full px-4 py-1 transition", active && "bg-brand/10")}>
                    <Icon className="size-5" />
                  </span>
                  {it.label}
                  {!!it.badge && (
                    <span className="absolute right-[calc(50%-22px)] top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {it.badge > 9 ? "9+" : it.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
