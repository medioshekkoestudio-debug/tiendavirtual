"use client";

import { useState } from "react";

const TIPOS = ["V", "E", "J", "G", "R"];

function parse(value: string) {
  const m = /^([VEJGPR])-?(.*)$/i.exec(value.trim());
  return m ? { tipo: m[1].toUpperCase(), numero: m[2] } : { tipo: "V", numero: value.replace(/[^\d-]/g, "") };
}

/**
 * Cédula o RIF: selector de tipo (V, E, J, G, R) y el número al lado. El valor completo es «V-12345678»:
 * con `name` va en un campo oculto del formulario y `onChange` lo avisa al cambiar.
 */
export function CedulaInput({
  id,
  name,
  defaultValue = "",
  onChange,
  required,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const [{ tipo, numero }, setDoc] = useState(() => parse(defaultValue));
  const full = numero ? `${tipo}-${numero}` : "";
  const update = (t: string, n: string) => {
    setDoc({ tipo: t, numero: n });
    onChange?.(n ? `${t}-${n}` : "");
  };

  return (
    <div className="flex gap-2">
      <select aria-label="Tipo de documento" className="input w-20 shrink-0" value={tipo} onChange={(e) => update(e.target.value, numero)}>
        {(TIPOS.includes(tipo) ? TIPOS : [...TIPOS, tipo]).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input
        id={id}
        className="input min-w-0 flex-1"
        inputMode="numeric"
        placeholder={tipo === "J" || tipo === "G" ? "12345678-9" : "12345678"}
        required={required}
        pattern="[0-9]{6,9}(-?[0-9])?"
        title="Solo números. Ejemplo: 12345678 o 12345678-9"
        value={numero}
        onChange={(e) => update(tipo, e.target.value.replace(/[^\d-]/g, "").slice(0, 12))}
      />
      {name && <input type="hidden" name={name} value={full} />}
    </div>
  );
}
