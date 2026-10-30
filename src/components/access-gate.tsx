"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Ticket } from "lucide-react";

/**
 * Aviso que no se puede cerrar cuando la tienda no tiene plan ni cupón vigente: tapa cualquier pantalla
 * del panel y lleva a comprar un plan. Pagar comisiones sigue permitido.
 */
export function AccessGate({ blocked, hadCoupon }: { blocked: boolean; hadCoupon: boolean }) {
  const pathname = usePathname();
  if (!blocked || pathname.startsWith("/panel/comisiones")) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="gate-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand/10 text-brand">
          <Lock className="size-7" />
        </span>
        <h2 id="gate-title" className="mt-4 text-xl font-bold">
          {hadCoupon ? "Tu cupón terminó" : "Activa tu plan"}
        </h2>
        <p className="mt-2 text-slate-600">Para seguir usando tu app y tu tienda, elige un plan y paga. Apenas aprobemos tu pago vuelves a tenerlo todo.</p>
        <div className="mt-5 space-y-2">
          <Link href="/suscripcion" className="btn-primary w-full py-3 text-base">
            Ver planes
          </Link>
          <Link href="/cupon" className="btn-outline w-full">
            <Ticket className="size-4" /> Tengo un cupón
          </Link>
        </div>
      </div>
    </div>
  );
}
