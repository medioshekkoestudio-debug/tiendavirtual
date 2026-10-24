import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getSession, homeForRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (isSupabaseConfigured()) {
    const { profile } = await getSession();
    if (profile) redirect(homeForRole(profile.role));
  }
  return (
    <AuthShell title="Iniciar sesión" subtitle="Accede al panel de tu tienda">
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Aún no tienes tienda?{" "}
        <Link href="/registro" className="font-semibold text-brand">Créala gratis</Link>
      </p>
    </AuthShell>
  );
}
