"use client";

import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { PAYMENT_METHODS } from "@/lib/constants";
import { editableDetails, methodImage } from "@/lib/payment-details";
import type { PaymentDetail, PaymentMethodConfig, PaymentMethodKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type Methods<K extends PaymentMethodKey> = Partial<Record<K, PaymentMethodConfig>>;

/** Estado inicial del editor: cada método con sus datos en formato editable. */
export function initMethods<K extends PaymentMethodKey>(keys: K[], saved: Methods<K> | undefined): Methods<K> {
  const init: Methods<K> = {};
  for (const k of keys) {
    const cfg = saved?.[k];
    init[k] = { enabled: Boolean(cfg?.enabled), details: editableDetails(k, cfg), image_url: methodImage(cfg) };
  }
  return init;
}

/**
 * Editor de métodos de pago: activar cada método y editar sus datos (etiqueta y valor),
 * agregar o eliminar datos y subir una imagen o QR. Lo usan las tiendas y el Superadmin.
 */
export function PaymentMethodsEditor<K extends PaymentMethodKey>({
  keys,
  value,
  onChange,
  userId,
}: {
  keys: K[];
  value: Methods<K>;
  onChange: (next: Methods<K>) => void;
  userId: string;
}) {
  const update = (k: K, patch: Partial<PaymentMethodConfig>) => onChange({ ...value, [k]: { ...value[k]!, ...patch } });
  const setDetail = (k: K, i: number, patch: Partial<PaymentDetail>) =>
    update(k, { details: (value[k]!.details ?? []).map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  return (
    <div className="space-y-3">
      {keys.map((k) => {
        const cfg = value[k]!;
        const details = cfg.details ?? [];
        return (
          <div key={k} className={cn("rounded-2xl border bg-white p-4 transition", cfg.enabled ? "border-brand" : "border-slate-200")}>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="font-semibold">{PAYMENT_METHODS[k].label}</span>
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand)]"
                checked={cfg.enabled}
                onChange={(e) => update(k, { enabled: e.target.checked })}
              />
            </label>
            {cfg.enabled && (
              <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_9rem]">
                <div className="space-y-2">
                  {details.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        className="input w-2/5 text-sm"
                        placeholder="Dato (ej.: Banco)"
                        aria-label="Nombre del dato"
                        maxLength={60}
                        value={d.label}
                        onChange={(e) => setDetail(k, i, { label: e.target.value })}
                      />
                      <input
                        className="input min-w-0 flex-1 text-sm"
                        placeholder="Valor"
                        aria-label={d.label ? `Valor de ${d.label}` : "Valor"}
                        maxLength={300}
                        value={d.value}
                        onChange={(e) => setDetail(k, i, { value: e.target.value })}
                      />
                      <button
                        type="button"
                        className="rounded-lg p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Eliminar ${d.label || "dato"}`}
                        onClick={() => update(k, { details: details.filter((_, j) => j !== i) })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
                    onClick={() => update(k, { details: [...details, { label: "", value: "" }] })}
                  >
                    <Plus className="size-4" /> Agregar dato
                  </button>
                </div>
                <ImageUpload
                  value={cfg.image_url || null}
                  onChange={(url) => update(k, { image_url: url ?? "" })}
                  userId={userId}
                  folder="pagos"
                  label="Imagen o QR"
                  fit="contain"
                  className="aspect-square w-36"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
