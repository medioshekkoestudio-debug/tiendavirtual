"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewPayment } from "@/lib/store-actions";

export function ReviewButtons({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (approve: boolean) => {
    if (!approve && !confirm("¿Rechazar este pago? El pedido se cancelará y el stock se devolverá.")) return;
    setError(null);
    startTransition(async () => {
      const res = await reviewPayment(paymentId, approve);
      if (res.error) setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-success" disabled={pending} onClick={() => run(true)}>
          <Check className="size-4" /> Aprobar
        </button>
        <button type="button" className="btn-danger" disabled={pending} onClick={() => run(false)}>
          <X className="size-4" /> Rechazar
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
