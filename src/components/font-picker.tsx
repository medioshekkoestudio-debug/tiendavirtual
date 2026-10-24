"use client";

import { Check } from "lucide-react";
import { FONT_OPTIONS, fontFamily } from "@/lib/font-options";
import { cn } from "@/lib/utils";

/** Visualizador de tipografías: Sans serif vs Serif. */
export function FontPicker({ value, onChange, sample }: { value: string; onChange: (key: string) => void; sample: string }) {
  return (
    <div className="space-y-4">
      {(["sans", "serif"] as const).map((kind) => (
        <div key={kind}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {kind === "sans" ? "Sans serif — moderna, limpia, digital" : "Serif — clásica, elegante, editorial"}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {FONT_OPTIONS.filter((f) => f.kind === kind).map((f) => {
              const active = value === f.key;
              return (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => onChange(f.key)}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition",
                    active ? "border-brand bg-brand/5 ring-2 ring-brand/30" : "border-slate-200 bg-white hover:border-slate-400",
                  )}
                  style={{ fontFamily: fontFamily(f.key) }}
                >
                  {active && <Check className="absolute right-2 top-2 size-4 text-brand" />}
                  <span className="block text-3xl font-bold leading-none">Aa</span>
                  <span className="mt-2 block truncate text-base font-semibold">{sample || f.label}</span>
                  <span className="block text-xs text-slate-500" style={{ fontFamily: "var(--font-inter)" }}>
                    {f.label} · {f.mood}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-200 bg-white p-4" style={{ fontFamily: fontFamily(value) }}>
        <p className="text-xs text-slate-500" style={{ fontFamily: "var(--font-inter)" }}>Vista previa</p>
        <p className="text-2xl font-bold">{sample || "Tu tienda"}</p>
        <p className="text-slate-600">Ofertas de temporada · Envíos a todo el país · 0123456789</p>
      </div>
    </div>
  );
}
