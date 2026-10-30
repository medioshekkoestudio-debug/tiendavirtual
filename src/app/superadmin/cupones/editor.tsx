"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { saveCoupon } from "../actions";

export type CouponRow = { id: string; code: string; free_days: number; active: boolean; created_at: string; uses: number };

function CouponForm({ coupon, onDone }: { coupon?: CouponRow; onDone?: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [days, setDays] = useState(String(coupon?.free_days ?? 15));
  const [active, setActive] = useState(coupon?.active ?? true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = !coupon || code !== coupon.code || Number(days) !== coupon.free_days || active !== coupon.active;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveCoupon({ id: coupon?.id, code, free_days: Number(days), active });
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
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end">
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
      <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-brand" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Activo
      </label>
      <button className="btn-primary" disabled={pending || !dirty}>
        {coupon ? (pending ? "Guardando…" : "Guardar") : pending ? "Creando…" : (<><Plus className="size-4" /> Crear</>)}
      </button>
      {msg && <p className={`sm:col-span-4 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}
    </form>
  );
}

export function CouponEditor({ coupons }: { coupons: CouponRow[] }) {
  return (
    <div className="space-y-4">
      {coupons.map((c) => (
        <section key={c.id} className="card space-y-2 p-4">
          <CouponForm coupon={c} />
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
