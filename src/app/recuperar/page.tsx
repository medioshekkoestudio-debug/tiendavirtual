import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RecoverForm } from "./recover-form";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell title="Recuperar contraseña" subtitle="Confirma que eres tú con los datos que registraste y elige una contraseña nueva.">
      <RecoverForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-brand">← Volver al inicio de sesión</Link>
      </p>
    </AuthShell>
  );
}
