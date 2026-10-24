"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setStoreActive } from "./actions";

export function StoreToggle({ storeId, active }: { storeId: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        (active ? confirm("¿Suspender esta tienda? Sus clientes no podrán verla.") : true) &&
        startTransition(async () => {
          await setStoreActive(storeId, !active);
          router.refresh();
        })
      }
      className={cn("chip", active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}
    >
      {active ? "Activa" : "Suspendida"}
    </button>
  );
}
