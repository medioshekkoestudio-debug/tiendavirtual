"use client";

import { clearDraft, useDraftState, useFormDraft } from "@/lib/draft";
import { ReferenceInput } from "@/components/reference-input";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Copy, FileCheck2, Loader2, Paperclip, PartyPopper } from "lucide-react";
import { RegistrationFields } from "@/app/registro/register-form";
import { Money, RateNote, type Rate } from "@/components/money";
import { PaymentDetailsView } from "@/components/payment-details-view";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_METHODS, PLAN_KEYS, PLAN_PAYMENT_METHOD_KEYS, PLANS, planPrice } from "@/lib/constants";
import type { PaymentMethodConfig, PlanCycle, PlanKey, PlanPaymentMethodKey } from "@/lib/types";
import { cn, formatBs, toBs } from "@/lib/utils";
import { createPlanSignup, createSubscriptionPayment, getNewReceiptUploadUrl } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;

type Step = "plan" | "registro" | "pago" | "listo";
const STEP_LABELS: Record<Step, string> = { plan: "Plan", registro: "Datos de registro", pago: "Pago", listo: "Listo" };

/**
 * Pasarela de pago del plan, por pasos. Sin sesión (userId vacío) incluye «Datos de registro»:
 * se crea la cuenta y la tienda junto con el pago, y la cuenta se activa al aprobarlo.
 */
export function SubscriptionCheckout({
  userId,
  methods,
  initialPlan,
  initialCycle,
  rate,
}: {
  userId?: string;
  rate: Rate;
  methods: Partial<Record<PlanPaymentMethodKey, PaymentMethodConfig>>;
  initialPlan: PlanKey;
  initialCycle: PlanCycle;
}) {
  const router = useRouter();
  const steps: Step[] = userId ? ["plan", "pago", "listo"] : ["plan", "registro", "pago", "listo"];
  const available = PLAN_PAYMENT_METHOD_KEYS.filter((k) => methods[k]?.enabled);
  const draft = `linki:plan:${userId ?? "nuevo"}`;
  const [step, setStep] = useDraftState<Step>(`${draft}:paso`, "plan");
  const [plan, setPlan] = useDraftState<PlanKey>(`${draft}:plan`, initialPlan);
  const [cycle, setCycle] = useDraftState<PlanCycle>(`${draft}:ciclo`, initialCycle);
  const [method, setMethod] = useDraftState<PlanPaymentMethodKey | null>(`${draft}:metodo`, available[0] ?? null);
  const [receipt, setReceipt] = useDraftState<{ path: string; name: string } | null>(`${draft}:comprobante`, null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string; store: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useFormDraft(`${draft}:campos`, formRef);
  // La pantalla final no queda como borrador (se borra después de que el paso se guarde)
  useEffect(() => {
    if (step === "listo") clearDraft(draft);
  }, [step, draft]);
  const registroRef = useRef<HTMLFieldSetElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const price = planPrice(plan, cycle);
  const index = steps.indexOf(step);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function nextFromRegistro() {
    for (const el of Array.from(registroRef.current?.elements ?? [])) {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
        if (!el.checkValidity()) return el.reportValidity();
      }
    }
    go("pago");
  }

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return setError("El comprobante debe ser una imagen o un PDF");
    if (file.size > MAX_BYTES) return setError("El archivo supera 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const bucket = createClient().storage.from("payment-receipts");
    let path: string;
    let upErr: { message: string } | null;
    if (userId) {
      path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      ({ error: upErr } = await bucket.upload(path, file, { contentType: file.type }));
    } else {
      const signed = await getNewReceiptUploadUrl(ext);
      if (signed.error || !signed.path || !signed.token) {
        setUploading(false);
        return setError(signed.error ?? "No se pudo subir el comprobante");
      }
      path = signed.path;
      ({ error: upErr } = await bucket.uploadToSignedUrl(path, signed.token, file, { contentType: file.type }));
    }
    setUploading(false);
    if (upErr) return setError("No se pudo subir el comprobante: " + upErr.message);
    setReceipt({ path, name: file.name });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== "pago") return;
    setError(null);
    if (!method) return setError("Elige un método de pago");
    if (!receipt) return setError("Adjunta el comprobante del pago");
    const fd = new FormData(e.currentTarget);
    const reference = String(fd.get("reference") ?? "");
    startTransition(async () => {
      if (userId) {
        const res = await createSubscriptionPayment({ plan, cycle, method, reference, receipt_path: receipt.path });
        if (res.error) return setError(res.error);
        router.refresh();
      } else {
        fd.set("plan", plan);
        fd.set("cycle", cycle);
        fd.set("method", method);
        fd.set("receipt_path", receipt.path);
        const res = await createPlanSignup(fd);
        if (res.error) {
          if (res.step === "registro") setStep("registro");
          return setError(res.error);
        }
        setCredentials({
          email: String(fd.get("email") ?? "").trim().toLowerCase(),
          password: String(fd.get("password") ?? ""),
          store: String(fd.get("company_name") ?? "").trim(),
        });
      }
      clearDraft(draft);
      go("listo");
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6" noValidate>
      <ol className="flex items-start" aria-label="Pasos del pago">
        {steps.map((s, i) => (
          <li key={s} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
            {i > 0 && (
              <span aria-hidden className={cn("absolute top-4 right-1/2 h-1 w-full -translate-y-1/2 rounded-full", i <= index ? "bg-brand" : "bg-slate-200")} />
            )}
            <span
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold transition",
                i < index ? "bg-brand text-white" : i === index ? "bg-brand text-white ring-4 ring-brand/20" : "bg-slate-200 text-slate-500",
              )}
            >
              {i < index ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-xs font-semibold", i <= index ? "text-slate-900" : "text-slate-400")}>{STEP_LABELS[s]}</span>
          </li>
        ))}
      </ol>

      {/* Paso: Plan */}
      <section hidden={step !== "plan"} className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Elige tu plan</h2>
        <div className="flex w-fit rounded-xl bg-slate-200/70 p-1" role="group" aria-label="Forma de pago">
          {(
            [
              ["mensual", "Mensual"],
              ["anual", "Anual · ahorra 2 meses"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={cycle === k}
              onClick={() => setCycle(k)}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", cycle === k ? "bg-white text-slate-900 shadow" : "text-slate-500")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={plan === k}
              onClick={() => setPlan(k)}
              className={cn(
                "rounded-2xl border bg-white p-4 text-left transition",
                plan === k ? "border-brand ring-2 ring-brand/20" : "border-slate-200 hover:border-slate-400",
              )}
            >
              <p className="font-bold">Plan {PLANS[k].label}</p>
              <p className="text-2xl font-extrabold">
                ${planPrice(k, cycle)}
                <span className="text-sm font-medium text-slate-500"> / {cycle === "anual" ? "año" : "mes"}</span>
              </p>
              {rate && <p className="text-xs font-semibold text-slate-500">{formatBs(toBs(planPrice(k, cycle), rate.rate))}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {PLANS[k].products} · {PLANS[k].commission}
              </p>
            </button>
          ))}
        </div>
        <RateNote rate={rate} />
        <button type="button" className="btn-primary w-full py-3 text-base" onClick={() => go(steps[1])}>
          Continuar con el Plan {PLANS[plan].label} (${price})
        </button>
      </section>

      {/* Paso: Datos de registro (solo sin sesión) */}
      {!userId && (
        <section hidden={step !== "registro"} className="card space-y-4 p-5">
          <div>
            <h2 className="text-lg font-bold">Datos de registro</h2>
            <p className="mt-1 text-sm text-slate-600">
              Con estos datos crearemos tu cuenta y tu tienda. Podrás iniciar sesión con tu email y contraseña apenas tu pago sea aprobado.
            </p>
          </div>
          <fieldset ref={registroRef} className="space-y-4">
            <RegistrationFields />
          </fieldset>
          {error && step === "registro" && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => go("plan")}>
              <ArrowLeft className="size-4" /> Atrás
            </button>
            <button type="button" className="btn-primary flex-1 py-3 text-base" onClick={nextFromRegistro}>
              Continuar al pago
            </button>
          </div>
          <p className="text-center text-sm text-slate-600">
            ¿Ya tienes tienda?{" "}
            <Link href={`/login?next=${encodeURIComponent(`/suscripcion?plan=${plan}&ciclo=${cycle}`)}`} className="font-semibold text-brand">
              Inicia sesión
            </Link>
          </p>
        </section>
      )}

      {/* Paso: Pago */}
      <section hidden={step !== "pago"} className="card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Paga y adjunta el comprobante</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span>
              Plan {PLANS[plan].label} <span className="text-slate-500">· {cycle}</span>
            </span>
            <Money usd={price} rate={rate} className="items-end font-semibold" />
          </div>
          <div className="mt-3 flex items-start justify-between gap-3 border-t pt-3">
            <span className="font-bold">Total a pagar</span>
            <Money usd={price} rate={rate} className="items-end text-lg font-extrabold" bsClassName="text-base font-bold text-brand" />
          </div>
          <RateNote rate={rate} className="mt-1" />
        </div>
        {!available.length ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Aún no hay métodos de pago disponibles. Escríbenos para activar tu plan.
          </p>
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
                        {method === "pago_movil" && rate ? `${formatBs(toBs(price, rate.rate))} (${price})` : `${price} USD`}
                      </dd>
                    </div>
                  }
                />
              </div>
            )}
            <ReferenceInput method={method} id="sub-ref" name="reference" />
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
        {error && step === "pago" && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-outline" onClick={() => go(steps[index - 1])} disabled={pending}>
            <ArrowLeft className="size-4" /> Atrás
          </button>
          {available.length > 0 && (
            <button className="btn-primary flex-1 py-3 text-base" disabled={pending || uploading}>
              {pending ? "Enviando…" : `Enviar pago ($${price})`}
            </button>
          )}
        </div>
      </section>

      {/* Paso: Listo */}
      {step === "listo" && (
        <section className="card p-6 text-center">
          {userId ? (
            <>
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h2 className="mt-3 text-xl font-bold">¡Recibimos tu pago!</h2>
            <p className="mt-1 text-sm text-slate-600">Lo verificaremos y activaremos tu Plan {PLANS[plan].label} lo antes posible.</p>
            </>
          ) : (
            credentials && <StoreCreated {...credentials} planLabel={PLANS[plan].label} />
          )}
        </section>
      )}
    </form>
  );
}

/** Final de la pasarela sin sesión: felicita y muestra en grande los datos para iniciar sesión */
function StoreCreated({ email, password, store, planLabel }: { email: string; password: string; store: string; planLabel: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Está a la vista para copiarlo a mano
    }
  };
  const rows = [
    { key: "usuario", label: "Usuario (tu email)", value: email },
    { key: "clave", label: "Contraseña", value: password },
  ];
  return (
    <div className="space-y-5">
      <div>
        <PartyPopper className="mx-auto size-12 text-brand" />
        <h2 className="mt-3 text-2xl font-extrabold">¡Felicidades, creaste tu tienda!</h2>
        {store && <p className="mt-1 text-lg font-semibold text-brand">{store}</p>}
      </div>
      <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 text-left">
        <p className="text-center font-semibold">Recuerda guardar los datos de inicio de sesión de tu tienda:</p>
        <dl className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="rounded-xl bg-white p-3 shadow-sm">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r.label}</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 break-all font-mono text-xl font-bold sm:text-2xl">{r.value}</span>
                <button
                  type="button"
                  onClick={() => copy(r.key, r.value)}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label={`Copiar ${r.label.toLowerCase()}`}
                >
                  {copied === r.key ? <Check className="size-5 text-emerald-600" /> : <Copy className="size-5" />}
                </button>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center text-xs text-slate-500">Haz una captura de pantalla o anótalos en un lugar seguro.</p>
      </div>
      <p className="text-sm text-slate-600">
        Ya puedes iniciar sesión con estos datos y preparar tu tienda. Verificaremos tu pago del Plan {planLabel} y{" "}
        <strong>te avisaremos apenas sea aprobado</strong> para que uses tu app sin restricciones.
      </p>
      <Link href="/login" className="btn-primary w-full py-3 text-base">
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
