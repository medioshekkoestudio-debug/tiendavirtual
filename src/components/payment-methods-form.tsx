"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS } from "@/lib/constants";
import { savePaymentMethods } from "@/lib/store-actions";
import type { PaymentMethodConfig, PaymentMethodKey, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PaymentMethodsForm({
  store,
  submitLabel = "Guardar métodos de pago",
  onSaved,
}: {
  store: Store;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Partial<Record<PaymentMethodKey, PaymentMethodConfig>>>(() => {
    const init: Partial<Record<PaymentMethodKey, PaymentMethodConfig>> = {};
    for (const k of PAYMENT_METHOD_KEYS) init[k] = { enabled: false, ...(store.payment_methods?.[k] ?? {}) };
    return init;
  });

  const setField = (k: PaymentMethodKey, field: string, value: string | boolean) => {
    setSaved(false);
    setData((d) => ({ ...d, [k]: { ...d[k]!, [field]: value } }));
  };

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await savePaymentMethods(data);
      if (res.error) return setError(res.error);
      setSaved(true);
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-3">
      {PAYMENT_METHOD_KEYS.map((k) => {
        const cfg = data[k]!;
        return (
          <div key={k} className={cn("rounded-2xl border bg-white p-4 transition", cfg.enabled ? "border-brand" : "border-slate-200")}>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="font-semibold">{PAYMENT_METHODS[k].label}</span>
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand)]"
                checked={Boolean(cfg.enabled)}
                onChange={(e) => setField(k, "enabled", e.target.checked)}
              />
            </label>
            {cfg.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS[k].fields.map((f) => (
                  <div key={f.key}>
                    <label className="label text-xs" htmlFor={`${k}-${f.key}`}>{f.label}</label>
                    <input
                      id={`${k}-${f.key}`}
                      className="input"
                      type={f.type ?? "text"}
                      placeholder={f.placeholder}
                      value={String(cfg[f.key] ?? "")}
                      onChange={(e) => setField(k, f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">Guardado ✓</span>}
      </div>
    </div>
  );
}
