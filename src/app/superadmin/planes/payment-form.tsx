"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodsEditor, initMethods } from "@/components/payment-methods-editor";
import { PLAN_PAYMENT_METHOD_KEYS } from "@/lib/constants";
import type { PaymentMethodConfig, PlanPaymentMethodKey } from "@/lib/types";
import { savePlatformPaymentMethods } from "../actions";

export function PlatformPaymentForm({
  initial,
  userId,
}: {
  initial: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  userId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [data, setData] = useState(() => initMethods(PLAN_PAYMENT_METHOD_KEYS, initial));

  return (
    <div className="space-y-3">
      <PaymentMethodsEditor
        keys={PLAN_PAYMENT_METHOD_KEYS}
        value={data}
        onChange={(next) => {
          setMsg(null);
          setData(next);
        }}
        userId={userId}
      />
      {msg && <p className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>{msg.text}</p>}
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await savePlatformPaymentMethods(data);
            setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Datos de cobro guardados" });
            router.refresh();
          })
        }
      >
        {pending ? "Guardando…" : "Guardar datos de cobro"}
      </button>
    </div>
  );
}
