"use client";

import { useActionState } from "react";
import { Honeypot } from "@/components/honeypot";
import { FormError } from "@/components/auth-shell";
import { CedulaInput } from "@/components/cedula-input";
import { PasswordInput } from "@/components/password-input";
import { recover } from "./actions";

export function RecoverForm() {
  // Un solo estado: con token se muestra el paso 2; si el permiso vence vuelve sin token al paso 1
  const [state, action, pending] = useActionState(recover, undefined);

  if (state?.token) {
    return (
      <form action={action} className="space-y-4">
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.name ? `¡Listo, ${state.name}! ` : "¡Listo! "}Ahora elige tu contraseña nueva.
        </p>
        <input type="hidden" name="token" value={state.token} />
        <input type="hidden" name="name" value={state.name ?? ""} />
        <div>
          <label className="label" htmlFor="password">Contraseña nueva</label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" placeholder="Al menos 8 caracteres" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password_confirm">Repite la contraseña</label>
          <PasswordInput id="password_confirm" name="password_confirm" required minLength={8} autoComplete="new-password" />
        </div>
        <FormError message={state.error} />
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar y entrar"}</button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Honeypot />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoCapitalize="none" autoCorrect="off" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="cedula">Cédula de identidad / RIF</label>
        <CedulaInput id="cedula" name="cedula" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Teléfono que registraste</label>
        <input id="phone" name="phone" type="tel" required className="input" placeholder="0414-1234567" autoComplete="tel" />
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Comprobando…" : "Continuar"}</button>
    </form>
  );
}
