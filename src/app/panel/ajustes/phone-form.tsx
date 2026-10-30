"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOwnerPhone } from "@/lib/store-actions";

/** Editar el teléfono con el que se registró el dueño */
export function PhoneForm({ phone }: { phone: string }) {
  const router = useRouter();
  const [value, setValue] = useState(phone);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveOwnerPhone(value);
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Teléfono guardado" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-2">
      <label className="label" htmlFor="owner-phone">Teléfono</label>
      <div className="flex gap-2">
        <input
          id="owner-phone"
          type="tel"
          autoComplete="tel"
          className="input min-w-0 flex-1"
          placeholder="0414-1234567"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={pending || value.trim() === phone.trim()}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {msg && <p className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{msg.text}</p>}
    </form>
  );
}
