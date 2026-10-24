"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, MessageCircle, Package, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { home: Home, store: Store, payments: CreditCard, orders: Package, messages: MessageCircle, bag: ShoppingBag };
export type NavIcon = keyof typeof ICONS;

export function BottomNav({ items }: { items: { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
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
  );
}
