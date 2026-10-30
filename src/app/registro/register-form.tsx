"use client";

import { useEffect, useRef, useState } from "react";
import { Honeypot } from "@/components/honeypot";
import { CedulaInput } from "@/components/cedula-input";
import { PasswordInput } from "@/components/password-input";
import { RUBRO_KEYS, RUBROS, SITE_DOMAIN } from "@/lib/constants";

function previewSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 34);
}

/** Campos del registro de una empresa. Se usan en /registro y en el paso «Datos de registro» de la pasarela de planes. */
export function RegistrationFields() {
  const [company, setCompany] = useState("");
  const slug = previewSlug(company);
  return (
    <>
    <Honeypot />
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
      <CedulaInput id="cedula" name="cedula" required />
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
    <PasswordPair />
    </>
  );
}

/** Contraseña dos veces (con el ojo para verla): el segundo campo avisa si no coincide */
function PasswordPair() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmRef = useRef<HTMLInputElement>(null);
  // También si cambia la primera después de escribir la segunda
  useEffect(() => {
    confirmRef.current?.setCustomValidity(mismatch ? "Las contraseñas no coinciden" : "");
  }, [mismatch]);
  return (
    <>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres. Con ella iniciarás sesión en tu tienda.</p>
      </div>
      <div>
        <label className="label" htmlFor="password_confirm">Repite la contraseña</label>
        <PasswordInput
          id="password_confirm"
          name="password_confirm"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          ref={confirmRef}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="mt-1 text-xs font-medium text-rose-600">Las contraseñas no coinciden.</p>}
      </div>
    </>
  );
}
