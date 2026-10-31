"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, Plus } from "lucide-react";
import { PLAN_KEYS, PLANS } from "@/lib/constants";
import type { PlanKey } from "@/lib/types";
import { formatDate, siteUrl } from "@/lib/utils";
import { saveCoupon } from "../actions";

export type CouponRow = { id: string; code: string; free_days: number; active: boolean; plan: PlanKey | null; created_at: string; uses: number };

function CouponForm({ coupon, onDone }: { coupon?: CouponRow; onDone?: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [days, setDays] = useState(String(coupon?.free_days ?? 15));
  const [active, setActive] = useState(coupon?.active ?? true);
  const [plan, setPlan] = useState<string>(coupon?.plan ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = !coupon || code !== coupon.code || Number(days) !== coupon.free_days || active !== coupon.active || plan !== (coupon.plan ?? "");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveCoupon({ id: coupon?.id, code, free_days: Number(days), active, plan: plan || null });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: coupon ? "Guardado" : "Cupón creado" });
      if (!coupon) {
        setCode("");
        setDays("15");
      }
      onDone?.();
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_8rem_10rem_auto_auto] sm:items-end">
      <div>
        <label className="label" htmlFor={`code-${coupon?.id ?? "new"}`}>Código del cupón</label>
        <input
          id={`code-${coupon?.id ?? "new"}`}
          className="input font-mono"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
          placeholder="linkicupon3"
          maxLength={40}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor={`days-${coupon?.id ?? "new"}`}>Días de acceso</label>
        <input
          id={`days-${coupon?.id ?? "new"}`}
          className="input"
          type="number"
          min={1}
          max={3650}
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor={`plan-${coupon?.id ?? "new"}`}>Plan de la página</label>
        <select id={`plan-${coupon?.id ?? "new"}`} className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Sin cambiar</option>
          {PLAN_KEYS.map((k) => (
            <option key={k} value={k}>{PLANS[k].label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-brand" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Activo
      </label>
      <button className="btn-primary" disabled={pending || !dirty}>
        {coupon ? (pending ? "Guardando…" : "Guardar") : pending ? "Creando…" : (<><Plus className="size-4" /> Crear</>)}
      </button>
      {msg && <p className={`sm:col-span-5 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
    </form>
  );
}

export function CouponEditor({ coupons }: { coupons: CouponRow[] }) {
  return (
    <div className="space-y-4">
      {coupons.map((c) => (
        <section key={c.id} className="card space-y-2 p-4">
          <CouponForm coupon={c} />
          <ShareCoupon coupon={c} />
          <p className="text-xs text-slate-500">
            Usado por {c.uses} {c.uses === 1 ? "tienda" : "tiendas"} · creado el {formatDate(c.created_at, false)}
            {!c.active && " · desactivado: nadie más puede usarlo"}
          </p>
        </section>
      ))}
      {!coupons.length && <p className="card p-6 text-center text-slate-500">Aún no hay cupones.</p>}
      <section className="card space-y-3 border-dashed p-4">
        <h2 className="font-bold">Nuevo cupón</h2>
        <CouponForm />
      </section>
    </div>
  );
}

/** Copiar el código o enviarlo por WhatsApp con el link que abre el registro con el cupón ya escrito */
function ShareCoupon({ coupon }: { coupon: CouponRow }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl()}/cupon?codigo=${encodeURIComponent(coupon.code)}`;
  const text = [
    `¡Te regalo ${coupon.free_days} días de Linki App${coupon.plan ? ` con el plan ${PLANS[coupon.plan].label}` : ""}! 🎁`,
    "Crea tu tienda online y tu app con tu marca.",
    `Cupón: *${coupon.code}*`,
    `Regístrate aquí: ${link}`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copia el cupón:", coupon.code);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={copy} disabled={!coupon.active}>
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? "Copiado" : "Copiar cupón"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!coupon.active}
        className={`btn-outline px-3 py-1.5 text-sm ${coupon.active ? "" : "pointer-events-none opacity-50"}`}
      >
        <MessageCircle className="size-4" /> Compartir por WhatsApp
      </a>
    </div>
  );
}
