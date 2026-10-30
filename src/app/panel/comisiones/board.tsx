"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, FileCheck2, Loader2, Paperclip, X } from "lucide-react";
import { Money, RateNote, type Rate } from "@/components/money";
import { PaymentDetailsView } from "@/components/payment-details-view";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_METHODS, PLAN_PAYMENT_METHOD_KEYS } from "@/lib/constants";
import type { CommissionState, PaymentMethodConfig, PlanPaymentMethodKey } from "@/lib/types";
import { cn, formatBs, formatDate, formatMoney, toBs } from "@/lib/utils";
import { createCommissionPayment } from "./actions";

export type CommissionRow = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  commission: number;
  created_at: string;
  state: CommissionState;
};

const STATE: Record<CommissionState, { label: string; className: string }> = {
  por_pagar: { label: "Por pagar", className: "bg-amber-100 text-amber-800" },
  en_revision: { label: "En revisión", className: "bg-sky-100 text-sky-800" },
  pagada: { label: "Pagada", className: "bg-emerald-100 text-emerald-800" },
};

/** Lo que se va a pagar: todas las comisiones por pagar (orderIds null) o las elegidas. */
type Selection = { orderIds: string[] | null; amount: number; count: number };

export function CommissionsBoard({
  rows,
  totalDue,
  totalDueCount,
  userId,
  rate,
  methods,
}: {
  rows: CommissionRow[];
  totalDue: number;
  totalDueCount: number;
  userId: string;
  rate: Rate;
  methods: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<Selection | null>(null);
  const due = rows.filter((r) => r.state === "por_pagar");
  const picked = due.filter((r) => checked.has(r.id));
  const pickedAmount = Math.round(picked.reduce((a, r) => a + r.commission, 0) * 100) / 100;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={totalDue <= 0}
          onClick={() => setPaying({ orderIds: null, amount: totalDue, count: totalDueCount })}
        >
          Pagar todas ({formatMoney(totalDue)})
        </button>
        {picked.length > 0 && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPaying({ orderIds: picked.map((r) => r.id), amount: pickedAmount, count: picked.length })}
          >
            Pagar {picked.length} seleccionadas ({formatMoney(pickedAmount)})
          </button>
        )}
        {due.length > 1 && (
          <button
            type="button"
            className="ml-auto text-sm font-semibold text-brand"
            onClick={() => setChecked(picked.length === due.length ? new Set() : new Set(due.map((r) => r.id)))}
          >
            {picked.length === due.length ? "Quitar selección" : "Seleccionar las de este periodo"}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            {r.state === "por_pagar" ? (
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-[var(--brand)]"
                checked={checked.has(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`Seleccionar la comisión del pedido ${r.order_number}`}
              />
            ) : (
              <span className="size-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                Pedido #{r.order_number} · {r.customer_name}
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(r.created_at)} · venta {formatMoney(r.total)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-bold">{formatMoney(r.commission)}</span>
              <span className={cn("chip", STATE[r.state].className)}>{STATE[r.state].label}</span>
            </div>
            {r.state === "por_pagar" && (
              <button
                type="button"
                className="btn-outline shrink-0 px-3 py-1.5 text-xs"
                onClick={() => setPaying({ orderIds: [r.id], amount: r.commission, count: 1 })}
              >
                Pagar
              </button>
            )}
          </li>
        ))}
        {!rows.length && (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            No hay comisiones en este periodo.
          </li>
        )}
      </ul>

      {paying && (
        <CommissionCheckout
          selection={paying}
          userId={userId}
          rate={rate}
          methods={methods}
          onClose={(done) => {
            setPaying(null);
            if (done) setChecked(new Set());
          }}
        />
      )}
    </>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;
type Step = "resumen" | "pago" | "listo";
const STEPS: Step[] = ["resumen", "pago", "listo"];
const STEP_LABELS: Record<Step, string> = { resumen: "Resumen", pago: "Pago", listo: "Listo" };

/** Pasarela por pasos para enviar a Linki App el pago de las comisiones elegidas. */
function CommissionCheckout({
  selection,
  userId,
  rate,
  methods,
  onClose,
}: {
  selection: Selection;
  userId: string;
  rate: Rate;
  methods: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  onClose: (done: boolean) => void;
}) {
  const router = useRouter();
  const available = PLAN_PAYMENT_METHOD_KEYS.filter((k) => methods[k]?.enabled);
  const [step, setStep] = useState<Step>("resumen");
  const [method, setMethod] = useState<PlanPaymentMethodKey | null>(available[0] ?? null);
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const index = STEPS.indexOf(step);
  const amount = selection.amount;
  const label = selection.orderIds === null ? "Todas tus comisiones por pagar" : selection.count === 1 ? "1 comisión" : `${selection.count} comisiones`;

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return setError("El comprobante debe ser una imagen o un PDF");
    if (file.size > MAX_BYTES) return setError("El archivo supera 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/comisiones/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await createClient().storage.from("payment-receipts").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (upErr) return setError("No se pudo subir el comprobante: " + upErr.message);
    setReceipt({ path, name: file.name });
  }

  function submit() {
    setError(null);
    if (!method) return setError("Elige un método de pago");
    if (!reference.trim()) return setError("Escribe el número de referencia o ID de la transacción");
    if (!receipt) return setError("Adjunta el comprobante del pago");
    startTransition(async () => {
      const res = await createCommissionPayment({ orderIds: selection.orderIds, method, reference, receipt_path: receipt.path });
      if (res.error) return setError(res.error);
      setStep("listo");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Pagar comisiones">
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Pagar comisiones</h2>
          <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar" onClick={() => onClose(step === "listo")}>
            <X className="size-5" />
          </button>
        </div>

        <ol className="flex items-start" aria-label="Pasos del pago">
          {STEPS.map((s, i) => (
            <li key={s} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
              {i > 0 && (
                <span aria-hidden className={cn("absolute top-4 right-1/2 h-1 w-full -translate-y-1/2 rounded-full", i <= index ? "bg-brand" : "bg-slate-200")} />
              )}
              <span
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold",
                  i < index ? "bg-brand text-white" : i === index ? "bg-brand text-white ring-4 ring-brand/20" : "bg-slate-200 text-slate-500",
                )}
              >
                {i < index ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("text-xs font-semibold", i <= index ? "text-slate-900" : "text-slate-400")}>{STEP_LABELS[s]}</span>
            </li>
          ))}
        </ol>

        {step !== "listo" && (
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-bold">{label}</span>
              <Money usd={amount} rate={rate} className="items-end text-lg font-extrabold" bsClassName="text-base font-bold text-brand" />
            </div>
            <RateNote rate={rate} className="mt-1" />
          </div>
        )}

        {step === "resumen" && (
          <>
            <p className="text-sm text-slate-600">
              Paga este monto a Linki App con uno de los métodos del siguiente paso y adjunta el comprobante. Mientras lo verificamos, estas
              comisiones quedan «En revisión».
            </p>
            <button type="button" className="btn-primary w-full py-3 text-base" onClick={() => setStep("pago")}>
              Continuar al pago
            </button>
          </>
        )}

        {step === "pago" && (
          <>
            {!available.length ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Aún no hay métodos de pago disponibles. Escríbenos para pagar.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {available.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={method === k}
                      onClick={() => setMethod(k)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                        method === k ? "border-brand bg-brand/5 text-brand ring-2 ring-brand/20" : "border-slate-200",
                      )}
                    >
                      {PAYMENT_METHODS[k].label}
                    </button>
                  ))}
                </div>
                {method && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <PaymentDetailsView
                      method={method}
                      cfg={methods[method]}
                      extra={
                        <div className="rounded-xl bg-white px-3 py-2">
                          <dt className="text-[11px] text-slate-500">Monto</dt>
                          <dd className="text-sm font-semibold">
                            {method === "pago_movil" && rate ? `${formatBs(toBs(amount, rate.rate))} (${formatMoney(amount)})` : `${amount} USD`}
                          </dd>
                        </div>
                      }
                    />
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="com-ref">Número de referencia o ID de la transacción</label>
                  <input id="com-ref" className="input" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div>
                  <span className="label">Comprobante del pago (captura o PDF)</span>
                  <button
                    type="button"
                    onClick={() => !uploading && fileRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left text-sm transition hover:border-brand"
                  >
                    {uploading ? (
                      <Loader2 className="size-5 animate-spin text-brand" />
                    ) : receipt ? (
                      <FileCheck2 className="size-5 text-emerald-600" />
                    ) : (
                      <Paperclip className="size-5 text-slate-500" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{uploading ? "Subiendo…" : receipt ? receipt.name : "Adjuntar comprobante"}</span>
                    {receipt && !uploading && <span className="text-xs font-semibold text-brand">Cambiar</span>}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </>
            )}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn-outline" onClick={() => setStep("resumen")} disabled={pending}>
                <ArrowLeft className="size-4" /> Atrás
              </button>
              {available.length > 0 && (
                <button type="button" className="btn-primary flex-1 py-3 text-base" disabled={pending || uploading} onClick={submit}>
                  {pending ? "Enviando…" : `Enviar pago (${formatMoney(amount)})`}
                </button>
              )}
            </div>
          </>
        )}

        {step === "listo" && (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h3 className="mt-3 text-xl font-bold">¡Recibimos tu pago!</h3>
            <p className="mt-1 text-sm text-slate-600">
              Lo verificaremos lo antes posible. Mientras tanto, esas comisiones aparecen como «En revisión».
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => onClose(true)}>
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
