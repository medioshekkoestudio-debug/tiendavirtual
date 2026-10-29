"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodsEditor, initMethods } from "@/components/payment-methods-editor";
import { PAYMENT_METHOD_KEYS } from "@/lib/constants";
import { savePaymentMethods } from "@/lib/store-actions";
import type { Store } from "@/lib/types";

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
  const [data, setData] = useState(() => initMethods(PAYMENT_METHOD_KEYS, store.payment_methods));

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
      <PaymentMethodsEditor
        keys={PAYMENT_METHOD_KEYS}
        value={data}
        onChange={(next) => {
          setSaved(false);
          setData(next);
        }}
        userId={store.owner_id}
      />
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
