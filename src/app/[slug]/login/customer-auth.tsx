"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/auth-shell";
import { cn } from "@/lib/utils";
import { customerLogin, customerRegister } from "../actions";

export function CustomerAuth({
  slug,
  storeName,
  next,
  initialMode,
}: {
  slug: string;
  storeName: string;
  next: string;
  initialMode: "login" | "registro";
}) {
  const [mode, setMode] = useState(initialMode);
  const [loginState, loginAction, loginPending] = useActionState(customerLogin, undefined);
  const [regState, regAction, regPending] = useActionState(customerRegister, undefined);

  return (
    <div>
      <h1 className="font-brand text-2xl font-bold">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Para ver tu historial de compras y escribirle a {storeName}. No es necesario para comprar.
      </p>
      <div className="mt-5 flex rounded-xl bg-slate-100 p-1">
        {(["login", "registro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("flex-1 rounded-lg py-1.5 text-sm font-semibold", mode === m ? "bg-white shadow-sm" : "text-slate-600")}
          >
            {m === "login" ? "Iniciar sesión" : "Registrarme"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="mt-5 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="l-email">Email</label>
            <input id="l-email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="l-pass">Contraseña</label>
            <input id="l-pass" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <FormError message={loginState?.error} />
          <button className="btn-primary w-full" disabled={loginPending}>{loginPending ? "Entrando…" : "Entrar"}</button>
        </form>
      ) : (
        <form action={regAction} className="mt-5 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="r-name">Nombre y apellido</label>
            <input id="r-name" name="full_name" required autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="r-phone">Teléfono</label>
            <input id="r-phone" name="phone" type="tel" autoComplete="tel" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="r-email">Email</label>
            <input id="r-email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="r-pass">Contraseña</label>
            <input id="r-pass" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <FormError message={regState?.error} />
          <button className="btn-primary w-full" disabled={regPending}>{regPending ? "Creando…" : "Crear cuenta"}</button>
        </form>
      )}
    </div>
  );
}
