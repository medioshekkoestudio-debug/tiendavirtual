"use client";

import { useActionState, useState } from "react";
import { registerStore } from "@/app/auth-actions";
import { FormError } from "@/components/auth-shell";
import { RUBRO_KEYS, RUBROS, SITE_DOMAIN } from "@/lib/constants";

function previewSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 34);
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerStore, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <RegistrationFields />
      <FormError message={state?.error} />
      <button className="btn-primary w-full py-3 text-base" disabled={pending}>
        {pending ? "Creando tu tienda…" : "Registrarme y crear mi tienda"}
      </button>
    </form>
  );
}

/** Campos del registro de una empresa. Se usan en /registro y en el paso «Datos de registro» de la pasarela de planes. */
export function RegistrationFields() {
  const [company, setCompany] = useState("");
  const slug = previewSlug(company);
  return (
    <>
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
      <label className="label" htmlFor="industry">Rubro de la empresa</label>
      <select id="industry" name="industry" required className="input" defaultValue="">
        <option value="" disabled>¿Qué vendes?</option>
        {RUBRO_KEYS.map((k) => (
          <option key={k} value={k}>{RUBROS[k].label}</option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-slate-500">Te sugeriremos categorías según tu rubro. Puedes cambiarlo luego en Ajustes.</p>
    </div>
    <div>
      <label className="label" htmlFor="full_name">Nombre y apellido del responsable</label>
      <input id="full_name" name="full_name" required className="input" autoComplete="name" />
    </div>
    <div>
      <label className="label" htmlFor="cedula">Cédula de identidad / RIF</label>
      <input id="cedula" name="cedula" required className="input" placeholder="V-12345678 o J-12345678-9" autoCapitalize="characters"
        pattern="[VEJGPvejgp]-?[0-9]{6,9}(-?[0-9])?" title="Ejemplo: V-12345678 o J-12345678-9" />
    </div>
    <div>
      <label className="label" htmlFor="phone">Teléfono</label>
      <input id="phone" name="phone" type="tel" required className="input" placeholder="0414-1234567" autoComplete="tel"
        pattern="[0-9+\(\) \-]{10,}" title="Ejemplo: 0414-1234567" />
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
    </>
  );
}
