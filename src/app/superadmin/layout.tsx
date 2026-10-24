import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { getSession } from "@/lib/auth";
import { SuperadminTabs } from "./tabs";

export const metadata = { title: "Superadmin" };

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (!profile) redirect("/login");
  if (profile.role !== "superadmin") redirect(profile.role === "store_owner" ? "/panel" : "/");

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <ShieldCheck className="size-6 text-amber-300" />
          <div className="flex-1">
            <p className="font-bold leading-tight">Shopux · Superadmin</p>
            <p className="text-xs text-white/60">{profile.email}</p>
          </div>
          <Link href="/" target="_blank" className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">Ver landing</Link>
          <form action={signOut}>
            <input type="hidden" name="next" value="/login" />
            <button className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar sesión">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
        <SuperadminTabs />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
