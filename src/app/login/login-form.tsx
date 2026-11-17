"use client";

import Link from "next/link";
import { Honeypot } from "@/components/honeypot";
import { PasswordInput } from "@/components/password-input";
import { useActionState } from "react";
import { login } from "@/app/auth-actions";
import { FormError } from "@/components/auth-shell";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
          <Honeypot />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="username" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
        <div className="mt-1.5 text-right">
          <Link href="/recuperar" className="text-sm font-semibold text-brand">¿Olvidaste tu contraseña?</Link>
        </div>
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
