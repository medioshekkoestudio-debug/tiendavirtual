import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crear mi tienda" };

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu tienda" subtitle="En segundos tendrás tu propio link y tu app de gestión.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}
