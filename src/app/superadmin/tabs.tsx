"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/superadmin", label: "Estadísticas y tiendas" },
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
            pathname === t.href ? "border-amber-300 text-white" : "border-transparent text-white/60 hover:text-white",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
