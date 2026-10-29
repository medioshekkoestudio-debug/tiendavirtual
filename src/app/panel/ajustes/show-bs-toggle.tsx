"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShowBs } from "@/lib/store-actions";
import { cn } from "@/lib/utils";

/** Interruptor: mostrar el precio en bolívares debajo del precio en dólares de cada producto. Se guarda al tocarlo. */
export function ShowBsToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const res = await saveShowBs(next);
      if (res.error) {
        setOn(!next);
        return setError(res.error);
      }
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="block font-semibold">Mostrar precio en bolívares</span>
          <span className="block text-sm text-slate-600">
            Debajo del precio en dólares de cada producto, con la tasa BCV del día.
          </span>
        </span>
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-brand" : "bg-slate-300")}>
          <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
        </span>
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
