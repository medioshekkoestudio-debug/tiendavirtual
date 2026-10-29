"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSubscriptionPayment } from "../actions";

export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const review = (approve: boolean) => {
    if (!approve && !window.confirm("¿Rechazar este pago?")) return;
    setError(null);
    startTransition(async () => {
      const res = await reviewSubscriptionPayment(id, approve);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <button type="button" className="btn-primary px-3 py-1.5 text-xs" disabled={pending} onClick={() => review(true)}>
          Aprobar
        </button>
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={pending} onClick={() => review(false)}>
          Rechazar
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
