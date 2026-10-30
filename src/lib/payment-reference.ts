// Referencia del pago. En Pago Móvil se piden los últimos 6 dígitos: con eso, el monto en Bs y la fecha
// la conciliación encuentra el movimiento en el banco (services/pagos-api) sin leer el comprobante.

export const REF_DIGITS = 6;

/** Deja solo lo que se guarda: 6 dígitos en Pago Móvil, el texto tal cual en los demás métodos */
export function cleanReference(method: string | null | undefined, value: unknown) {
  const v = String(value ?? "").trim();
  return method === "pago_movil" ? v.replace(/\D/g, "").slice(-REF_DIGITS) : v.slice(0, 100);
}

/** Mensaje de error o null si la referencia sirve */
export function referenceError(method: string | null | undefined, value: unknown) {
  const raw = String(value ?? "").trim();
  if (method === "pago_movil") {
    return raw.replace(/\D/g, "").length >= REF_DIGITS ? null : "Escribe los últimos 6 dígitos de la referencia del Pago Móvil";
  }
  return raw ? null : "Escribe el número de referencia o ID de la transacción";
}
