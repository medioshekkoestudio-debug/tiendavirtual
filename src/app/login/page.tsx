import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { getSession, homeForRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (isSupabaseConfigured()) {
    const { profile } = await getSession();
    if (profile) redirect(safeNext ?? homeForRole(profile.role));
  }
  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={safeNext?.startsWith("/suscripcion") ? "Entra con tu tienda para elegir tu plan" : "Accede al panel de tu tienda"}
    >
      <LoginForm next={safeNext} />
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> o <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Link href="/cupon" className="btn-outline w-full">
        <Ticket className="size-4" /> Iniciar sesión con un cupón
      </Link>
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Aún no tienes tienda?{" "}
        <Link href="/suscripcion" className="font-semibold text-brand">
          Créala aquí
        </Link>
      </p>
    </AuthShell>
  );
}
