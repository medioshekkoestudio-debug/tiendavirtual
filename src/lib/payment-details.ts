import { PAYMENT_METHODS } from "@/lib/constants";
import type { PaymentDetail, PaymentMethodConfig, PaymentMethodKey } from "@/lib/types";

const MAX_DETAILS = 20;

/** Datos de cobro con valor, para mostrarlos al que paga. Convierte las configuraciones viejas (claves fijas). */
export function methodDetails(key: PaymentMethodKey, cfg: PaymentMethodConfig | undefined): PaymentDetail[] {
  if (!cfg) return [];
  if (Array.isArray(cfg.details)) return cfg.details.filter((d) => d.value?.trim());
  return PAYMENT_METHODS[key].fields
    .map((f) => ({ label: f.label, value: String(cfg[f.key] ?? "").trim() }))
    .filter((d) => d.value);
}

/** Datos para el editor: los guardados o, si el método es nuevo, los campos sugeridos vacíos. */
export function editableDetails(key: PaymentMethodKey, cfg: PaymentMethodConfig | undefined): PaymentDetail[] {
  if (Array.isArray(cfg?.details)) return cfg.details;
  const old = methodDetails(key, cfg);
  return old.length ? old : PAYMENT_METHODS[key].fields.map((f) => ({ label: f.label, value: "" }));
}

export function methodImage(cfg: PaymentMethodConfig | undefined) {
  const url = typeof cfg?.image_url === "string" ? cfg.image_url : "";
  return /^(https:\/\/|\/)/.test(url) && !url.startsWith("//") ? url : "";
}

/** Limpia lo que llega del navegador antes de guardarlo. */
export function cleanMethodConfig(src: PaymentMethodConfig): PaymentMethodConfig {
  const details = (Array.isArray(src.details) ? src.details : [])
    .map((d) => ({ label: String(d?.label ?? "").trim().slice(0, 60), value: String(d?.value ?? "").trim().slice(0, 300) }))
    .filter((d) => d.value)
    .slice(0, MAX_DETAILS);
  const image = methodImage(src).slice(0, 1000);
  return { enabled: Boolean(src.enabled), details, ...(image ? { image_url: image } : {}) };
}
