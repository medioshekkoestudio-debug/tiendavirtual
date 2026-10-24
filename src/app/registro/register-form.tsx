"use client";

import { useActionState, useState } from "react";
import { registerStore } from "@/app/auth-actions";
import { FormError } from "@/components/auth-shell";
import { SITE_DOMAIN } from "@/lib/constants";

function previewSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 34);
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerStore, undefined);
  const [company, setCompany] = useState("");
  const slug = previewSlug(company);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="company_name">Nombre de tu empresa</label>
        <input
          id="company_name"
          name="company_name"
          required
          minLength={3}
          className="input"
          placeholder="Empresa X"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Tu link de tienda: <span className="font-mono font-semibold text-brand">{SITE_DOMAIN}/{slug || "tuempresa"}</span>
        </p>
      </div>
      <div>
        <label className="label" htmlFor="full_name">Tu nombre y apellido</label>
        <input id="full_name" name="full_name" required className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary w-full py-3 text-base" disabled={pending}>
        {pending ? "Creando tu tienda…" : "Registrarme y crear mi tienda"}
      </button>
    </form>
  );
}
