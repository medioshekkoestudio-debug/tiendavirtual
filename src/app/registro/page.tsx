import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crear mi tienda" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Crea tu tienda" subtitle="En segundos tendrás tu propio link y tu app de gestión.">
      <RegisterForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
