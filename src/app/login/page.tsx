import Link from "next/link";
import { redirect } from "next/navigation";
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
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Aún no tienes tienda?{" "}
        <Link href={safeNext ? `/registro?next=${encodeURIComponent(safeNext)}` : "/registro"} className="font-semibold text-brand">
          Créala gratis
        </Link>
      </p>
    </AuthShell>
  );
}
