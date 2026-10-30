"use client";

import { REF_DIGITS } from "@/lib/payment-reference";

/** Campo de referencia: en Pago Móvil, los últimos 6 dígitos (teclado numérico); en los demás, el ID completo */
export function ReferenceInput({
  method,
  id,
  name,
  value,
  onChange,
}: {
  method: string | null;
  id: string;
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const pm = method === "pago_movil";
  return (
    <div>
      <label className="label" htmlFor={id}>
        {pm ? "Últimos 6 dígitos de la referencia" : "Número de referencia o ID de la transacción"}
      </label>
      <input
        key={pm ? "pm" : "other"}
        id={id}
        name={name}
        className="input font-mono"
        {...(pm
          ? { inputMode: "numeric" as const, pattern: "[0-9]{6}", maxLength: REF_DIGITS, placeholder: "123456", autoComplete: "off" }
          : { maxLength: 100, placeholder: "Ej.: 00123456" })}
        {...(onChange
          ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(pm ? e.target.value.replace(/\D/g, "").slice(0, REF_DIGITS) : e.target.value) }
          : {})}
      />
      {pm && <p className="mt-1 text-xs text-slate-500">Están al final del número de referencia de tu comprobante.</p>}
    </div>
  );
}
