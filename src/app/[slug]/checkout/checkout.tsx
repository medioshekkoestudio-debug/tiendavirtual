"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, CheckCircle2, MapPin, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart";
import { CedulaInput } from "@/components/cedula-input";
import { Money, RateNote, type Rate } from "@/components/money";
import { PaymentDetailsView } from "@/components/payment-details-view";
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS } from "@/lib/constants";
import type { PaymentMethodConfig, PaymentMethodKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { placeOrder } from "../actions";

const STEPS = ["Carrito", "Dirección", "Envío", "Facturación", "Pago"];

type Profile = { name: string; email: string; phone: string; cedula: string } | null;

export function Checkout({
  storeId,
  slug,
  paymentMethods,
  rate,
  profile,
}: {
  storeId: string;
  slug: string;
  paymentMethods: Partial<Record<PaymentMethodKey, PaymentMethodConfig>>;
  rate: Rate;
  profile: Profile;
}) {
  const cart = useCart()!;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ orderNumber?: number; accountCreated?: boolean } | null>(null);

  const [address, setAddress] = useState("");
  const [delivery, setDelivery] = useState<"envio" | "retiro">("envio");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [customer, setCustomer] = useState({
    name: profile?.name ?? "",
    cedula: profile?.cedula ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    notes: "",
  });
  const [addressOk, setAddressOk] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey | null>(null);
  const [reference, setReference] = useState("");

  const enabledMethods = PAYMENT_METHOD_KEYS.filter((k) => paymentMethods?.[k]?.enabled);
  const today = new Date().toISOString().slice(0, 10);
  const setC = (k: keyof typeof customer, v: string) => setCustomer((c) => ({ ...c, [k]: v }));

  function validate(s: number): string | null {
    if (s === 0 && cart.items.length === 0) return "Tu carrito está vacío";
    if (s === 2 && delivery === "envio") {
      if (!address.trim()) return "Escribe la dirección de envío (paso 2) o elige “Comprar sin envío”";
      if (!date || !time) return "Elige la fecha y hora estimada de entrega";
    }
    if (s === 3) {
      if (!customer.name.trim() || !customer.cedula.trim() || !customer.phone.trim()) return "Completa nombre, cédula y teléfono";
      if (delivery === "envio" && !addressOk) return "Confirma que la dirección está bien escrita";
      if (createAccount && !profile) {
        if (!/^\S+@\S+\.\S+$/.test(customer.email)) return "Escribe un email válido para tu cuenta";
        if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
      }
    }
    if (s === 4) {
      if (!method) return "Selecciona un método de pago";
      if (!reference.trim()) return "Escribe el número de referencia de tu pago";
    }
    return null;
  }

  function next() {
    const err = validate(step);
    setError(err);
    if (!err) setStep((s) => s + 1);
  }

  function submit() {
    const err = validate(4);
    if (err) return setError(err);
    setError(null);
    startTransition(async () => {
      const res = await placeOrder({
        storeId,
        slug,
        items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        customer,
        delivery: {
          type: delivery,
          address: delivery === "envio" ? address : "",
          scheduled_for: delivery === "envio" && date && time ? new Date(`${date}T${time}`).toISOString() : null,
        },
        payment: { method: method!, reference },
        account: createAccount && !profile ? { email: customer.email, password } : null,
      });
      if (res.error) return setError(res.error);
      cart.clear();
      setDone(res);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        <h1 className="font-brand mt-4 text-2xl font-bold">¡Pedido #{done.orderNumber} recibido!</h1>
        <p className="mt-2 text-slate-600">La tienda verificará tu pago y te avisará. Puedes escribirle por Mensajes.</p>
        {done.accountCreated && <p className="mt-2 text-sm font-medium text-emerald-700">Tu cuenta fue creada y ya iniciaste sesión.</p>}
        <div className="mt-6 flex flex-col gap-2">
          {(profile || done.accountCreated) && <Link href={`/${slug}/compras`} className="btn-primary">Ver mis compras</Link>}
          <Link href={`/${slug}`} className="btn-outline">Seguir comprando</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Progreso */}
      <ol className="mb-5 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn(
                "grid size-8 place-items-center rounded-full text-sm font-bold transition",
                i < step ? "bg-brand text-on-brand" : i === step ? "bg-brand text-on-brand ring-4 ring-brand/20" : "bg-slate-200 text-slate-500",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </button>
            <span className={cn("text-[10px] font-medium", i === step ? "text-brand" : "text-slate-500")}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="card space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-brand text-xl font-bold">1. Resumen de tu carrito</h2>
            {cart.items.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="mx-auto size-10 text-slate-300" />
                <p className="mt-2 text-slate-500">Tu carrito está vacío.</p>
                <Link href={`/${slug}`} className="btn-primary mt-4">Ver productos</Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.items.map((i) => (
                  <li key={i.product_id} className="flex items-center gap-3 py-3">
                    {i.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image_url} alt="" className="size-14 rounded-xl object-cover" />
                    ) : (
                      <div className="grid size-14 place-items-center rounded-xl bg-brand/10 font-bold text-brand">{i.name[0]}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{i.name}</p>
                      <Money usd={i.price} rate={rate} className="text-sm text-slate-500" bsClassName="text-[11px]" />
                      <div className="mt-1 flex items-center gap-2">
                        <button type="button" className="rounded-lg border p-1" aria-label="Menos" onClick={() => cart.setQty(i.product_id, i.quantity - 1)}>
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                        <button type="button" className="rounded-lg border p-1" aria-label="Más" onClick={() => cart.setQty(i.product_id, i.quantity + 1)}>
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <Money usd={i.price * i.quantity} rate={rate} className="items-end font-bold" />
                      <button type="button" className="mt-1 text-rose-500" aria-label="Quitar" onClick={() => cart.remove(i.product_id)}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-brand text-xl font-bold">2. Dirección de envío</h2>
            <div>
              <label className="label" htmlFor="address">Escribe la dirección de envío</label>
              <textarea
                id="address"
                className="input min-h-28"
                placeholder="Estado, ciudad, urbanización, calle, casa/apto, punto de referencia"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">¿No necesitas envío? Continúa y elige “Comprar sin envío” en el siguiente paso.</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-brand text-xl font-bold">3. Programar el envío</h2>
            <div className="grid gap-2">
              {(
                [
                  ["envio", "Programar envío", "Elige fecha y hora estimada en que necesitas el producto", CalendarClock],
                  ["retiro", "Solo comprar, sin envío", "Retiras o coordinas la entrega con la tienda", ShoppingBag],
                ] as const
              ).map(([k, title, desc, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDelivery(k)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                    delivery === k ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-slate-200",
                  )}
                >
                  <Icon className="mt-0.5 size-5 text-brand" />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-slate-500">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
            {delivery === "envio" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="date">Fecha</label>
                  <input id="date" type="date" min={today} className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="time">Hora estimada</label>
                  <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                {!address.trim() && (
                  <p className="col-span-2 text-sm text-amber-700">
                    Falta la dirección.{" "}
                    <button type="button" className="font-semibold underline" onClick={() => setStep(1)}>Escribirla</button>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-brand text-xl font-bold">4. Facturación</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="c-name">Nombre y apellido</label>
                <input id="c-name" className="input" autoComplete="name" value={customer.name} onChange={(e) => setC("name", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="c-ced">Cédula de identidad / RIF</label>
                <CedulaInput id="c-ced" defaultValue={customer.cedula} onChange={(v) => setC("cedula", v)} />
              </div>
              <div>
                <label className="label" htmlFor="c-phone">Teléfono</label>
                <input id="c-phone" type="tel" className="input" autoComplete="tel" value={customer.phone} onChange={(e) => setC("phone", e.target.value)} />
              </div>
            </div>

            {delivery === "envio" && (
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="flex items-center gap-1 text-sm font-semibold"><MapPin className="size-4" /> Confirma tu dirección</p>
                <textarea
                  className="input mt-2 min-h-20"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setAddressOk(false);
                  }}
                />
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={addressOk} onChange={(e) => setAddressOk(e.target.checked)} />
                  La dirección está bien escrita
                </label>
              </div>
            )}

            <div>
              <label className="label" htmlFor="c-notes">Comentarios o requerimientos</label>
              <textarea
                id="c-notes"
                className="input min-h-20"
                placeholder="Ej.: llamar antes de llegar, envolver para regalo…"
                value={customer.notes}
                onChange={(e) => setC("notes", e.target.value)}
              />
            </div>

            {profile ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Comprando con tu cuenta ({profile.email}).</p>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-3">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} />
                  Crear mi cuenta para ver mi historial de compras
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="c-email">Email {createAccount ? "" : "(opcional)"}</label>
                    <input id="c-email" type="email" className="input" autoComplete="email" value={customer.email} onChange={(e) => setC("email", e.target.value)} />
                  </div>
                  {createAccount && (
                    <div>
                      <label className="label" htmlFor="c-pass">Contraseña</label>
                      <input
                        id="c-pass"
                        type="password"
                        className="input"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-brand text-xl font-bold">5. Registrar pago</h2>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-slate-600">Total a pagar</span>
                <Money usd={cart.total} rate={rate} className="items-end text-lg font-extrabold text-slate-900" bsClassName="text-base font-bold text-brand" />
              </div>
              <RateNote rate={rate} className="mt-1" />
            </div>
            {enabledMethods.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Esta tienda aún no configuró métodos de pago. Escríbele por Mensajes.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {enabledMethods.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMethod(k)}
                    className={cn(
                      "rounded-2xl border p-3 text-sm font-semibold transition",
                      method === k ? "border-brand bg-brand/5 text-brand ring-2 ring-brand/20" : "border-slate-200",
                    )}
                  >
                    {PAYMENT_METHODS[k].label}
                  </button>
                ))}
              </div>
            )}
            {method && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">Datos para pagar con {PAYMENT_METHODS[method].label}</p>
                <PaymentDetailsView method={method} cfg={paymentMethods[method]} />
                <div className="pt-2">
                  <label className="label" htmlFor="ref">Número de referencia / ID de la transacción</label>
                  <input id="ref" className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej.: 00123456" />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {cart.items.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            {step > 0 ? (
              <button type="button" className="btn-ghost" onClick={() => { setError(null); setStep((s) => s - 1); }}>
                Atrás
              </button>
            ) : (
              <span className="flex items-start gap-1.5 text-sm text-slate-600">
                Total: <Money usd={cart.total} rate={rate} className="text-lg font-extrabold text-slate-900" />
              </span>
            )}
            {step < 4 ? (
              <button type="button" className="btn-primary px-6" onClick={next}>Continuar</button>
            ) : (
              <button type="button" className="btn-primary px-6" onClick={submit} disabled={pending || enabledMethods.length === 0}>
                {pending ? "Enviando…" : "Confirmar pedido"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
