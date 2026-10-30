"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/superadmin", label: "Estadísticas y tiendas" },
  { href: "/superadmin/planes", label: "Planes y cobros" },
  { href: "/superadmin/comisiones", label: "Comisiones" },
  { href: "/superadmin/cupones", label: "Cupones" },
  { href: "/superadmin/landing", label: "Editar landing" },
];

export function SuperadminTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 px-4">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition",
            pathname === t.href ? "border-brand text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
