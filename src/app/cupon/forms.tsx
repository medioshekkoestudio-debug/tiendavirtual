"use client";

import { Honeypot } from "@/components/honeypot";
import { useActionState, useState } from "react";
import { Ticket } from "lucide-react";
import { FormError } from "@/components/auth-shell";
import { RegistrationFields } from "@/app/registro/register-form";
import { cn } from "@/lib/utils";
import { TRIAL_COUPON } from "@/lib/constants";
import { loginWithCoupon, redeemCoupon, registerWithCoupon } from "./actions";

function CouponField({ initial, trial }: { initial: string; trial?: boolean }) {
  // Prueba gratis: el cupón va fijo y oculto
  if (trial) return <input type="hidden" name="coupon" value={TRIAL_COUPON} />;
  return (
    <div>
      <label className="label" htmlFor="coupon">Cupón</label>
      <div className="relative">
        <Ticket className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id="coupon"
          name="coupon"
          required
          defaultValue={initial}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input pl-9 font-mono"
          placeholder="Escribe tu cupón"
        />
      </div>
    </div>
  );
}

/** Con sesión de tienda: solo el cupón */
export function RedeemForm({ initial, trial }: { initial: string; trial?: boolean }) {
  const [state, action, pending] = useActionState(redeemCoupon, undefined);
  return (
    <form action={action} className="space-y-4">
      <CouponField initial={initial} trial={trial} />
      <FormError message={state?.error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Activando…" : trial ? "Activar mi prueba gratis" : "Activar cupón"}
      </button>
    </form>
  );
}

/** Sin sesión: «Ya tengo cuenta» (email y contraseña) o «Soy nuevo» (registro de la empresa) */
export function CouponForms({ initial, trial }: { initial: string; trial?: boolean }) {
  const [mode, setMode] = useState<"login" | "registro">(trial ? "registro" : "login");
  const [loginState, loginAction, loginPending] = useActionState(loginWithCoupon, undefined);
  const [regState, regAction, regPending] = useActionState(registerWithCoupon, undefined);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
        {(
          [
            ["login", "Ya tengo cuenta"],
            ["registro", "Soy nuevo"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={cn("rounded-xl py-2 text-sm font-semibold transition", mode === k ? "bg-white shadow-sm" : "text-slate-500")}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="space-y-4">
          <Honeypot />
          <CouponField initial={initial} trial={trial} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <FormError message={loginState?.error} />
          <button className="btn-primary w-full" disabled={loginPending}>
            {loginPending ? "Entrando…" : trial ? "Entrar y empezar mi prueba" : "Entrar con mi cupón"}
          </button>
        </form>
      ) : (
        <form action={regAction} className="space-y-4">
          <CouponField initial={initial} trial={trial} />
          <RegistrationFields />
          <FormError message={regState?.error} />
          <button className="btn-primary w-full py-3 text-base" disabled={regPending}>
            {regPending ? "Creando tu tienda…" : trial ? "Crear mi tienda gratis" : "Crear mi tienda con el cupón"}
          </button>
        </form>
      )}
    </div>
  );
}
