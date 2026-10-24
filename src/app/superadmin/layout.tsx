import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { SuperadminTabs } from "./tabs";

export const metadata = { title: "Superadmin" };

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (!profile) redirect("/login");
  if (profile.role !== "superadmin") redirect(profile.role === "store_owner" ? "/panel" : "/");

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo className="h-8" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-bold leading-tight">
              <ShieldCheck className="size-4 text-brand" /> Superadmin
            </p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
          </div>
          <Link href="/" target="_blank" className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Ver landing</Link>
          <form action={signOut}>
            <input type="hidden" name="next" value="/login" />
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Cerrar sesión">
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
