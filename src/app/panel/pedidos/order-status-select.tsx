"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS } from "@/lib/constants";
import { updateOrderStatus } from "@/lib/store-actions";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Estado del pedido"
      value={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateOrderStatus(orderId, e.target.value as OrderStatus);
          router.refresh();
        })
      }
      className={cn("rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none", ORDER_STATUS[status].className)}
    >
      {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS[s].label}
        </option>
      ))}
    </select>
  );
}
