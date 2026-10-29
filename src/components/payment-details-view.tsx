"use client";

import { Copy, Download } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { methodDetails, methodImage } from "@/lib/payment-details";
import type { PaymentMethodConfig, PaymentMethodKey } from "@/lib/types";

/** Datos de cobro de un método (con botón de copiar) y su imagen o QR, tal como los ve quien paga. */
export function PaymentDetailsView({ method, cfg, extra }: { method: PaymentMethodKey; cfg?: PaymentMethodConfig; extra?: React.ReactNode }) {
  const details = methodDetails(method, cfg);
  const image = methodImage(cfg);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <dl className="content-start space-y-1.5">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
            <div className="min-w-0">
              {d.label && <dt className="text-[11px] text-slate-500">{d.label}</dt>}
              <dd className="font-mono text-sm font-semibold break-all">
                {/^https?:\/\//.test(d.value) ? (
                  <a href={d.value} target="_blank" rel="noreferrer" className="text-brand underline">{d.value}</a>
                ) : (
                  d.value
                )}
              </dd>
            </div>
            <button
              type="button"
              className="shrink-0 text-slate-400 hover:text-brand"
              aria-label={`Copiar ${d.label || "dato"}`}
              onClick={() => navigator.clipboard?.writeText(d.value)}
            >
              <Copy className="size-4" />
            </button>
          </div>
        ))}
        {extra}
      </dl>
      {image && (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Imagen para pagar con ${PAYMENT_METHODS[method].label}`} className="mx-auto w-48 rounded-xl border border-slate-200 bg-white p-2" />
          <a href={image} download target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <Download className="size-3.5" /> Guardar imagen
          </a>
        </div>
      )}
    </div>
  );
}
