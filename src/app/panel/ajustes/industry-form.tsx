"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RUBRO_KEYS, RUBROS } from "@/lib/constants";
import { saveIndustry } from "@/lib/store-actions";

export function IndustryForm({ industry }: { industry: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(industry ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <select className="input" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Rubro de la tienda">
        <option value="" disabled>Elige tu rubro</option>
        {RUBRO_KEYS.map((k) => (
          <option key={k} value={k}>{RUBROS[k].label}</option>
        ))}
      </select>
      {value && value !== (industry ?? "") && (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveIndustry(value);
              setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Rubro actualizado" });
              router.refresh();
            })
          }
        >
          Guardar rubro
        </button>
      )}
      {msg && <p className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>{msg.text}</p>}
    </div>
  );
}
