"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { LandingContent } from "@/lib/types";
import { saveLanding } from "../actions";

type TextKey = Exclude<keyof LandingContent, "features">;

const FIELDS: { key: TextKey; label: string; long?: boolean }[] = [
  { key: "brand_name", label: "Nombre de la marca (barra de navegación)" },
  { key: "hero_title", label: "Título del banner" },
  { key: "hero_subtitle", label: "Subtítulo del banner", long: true },
  { key: "hero_image", label: "Imagen de fondo del banner (URL, opcional)" },
  { key: "description_title", label: "Título de la descripción" },
  { key: "description", label: "Descripción de la plataforma", long: true },
  { key: "cta_text", label: "Texto del botón grande" },
  { key: "footer_text", label: "Pie de página" },
];

export function LandingEditor({ initial }: { initial: LandingContent }) {
  const [c, setC] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const setFeature = (i: number, k: "title" | "text", v: string) =>
    setC((x) => ({ ...x, features: x.features.map((f, j) => (j === i ? { ...f, [k]: v } : f)) }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-4 p-5">
        <h1 className="text-xl font-bold">Contenido de la landing principal</h1>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={f.key}>{f.label}</label>
            {f.long ? (
              <textarea id={f.key} className="input min-h-24" value={c[f.key]} onChange={(e) => setC({ ...c, [f.key]: e.target.value })} />
            ) : (
              <input id={f.key} className="input" value={c[f.key]} onChange={(e) => setC({ ...c, [f.key]: e.target.value })} />
            )}
          </div>
        ))}

        <div>
          <p className="label">Beneficios</p>
          <div className="space-y-2">
            {c.features.map((f, i) => (
              <div key={i} className="flex gap-2 rounded-xl border border-slate-200 p-2">
                <div className="flex-1 space-y-2">
                  <input className="input" placeholder="Título" value={f.title} onChange={(e) => setFeature(i, "title", e.target.value)} />
                  <textarea className="input" placeholder="Texto" value={f.text} onChange={(e) => setFeature(i, "text", e.target.value)} />
                </div>
                <button
                  type="button"
                  aria-label="Quitar beneficio"
                  className="self-start rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  onClick={() => setC((x) => ({ ...x, features: x.features.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {c.features.length < 6 && (
            <button type="button" className="btn-outline mt-2" onClick={() => setC((x) => ({ ...x, features: [...x.features, { title: "", text: "" }] }))}>
              <Plus className="size-4" /> Agregar beneficio
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveLanding(c);
                setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Landing publicada ✓" });
              })
            }
          >
            {pending ? "Guardando…" : "Guardar y publicar"}
          </button>
          {msg && <span className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>{msg.text}</span>}
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
        <p className="text-sm font-semibold text-slate-500">Vista previa</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b px-4 py-2 text-sm font-extrabold">{c.brand_name}</div>
          <div
            className="bg-gradient-to-br from-violet-700 to-fuchsia-500 px-4 py-8 text-white"
            style={c.hero_image ? { backgroundImage: `linear-gradient(rgba(30,27,75,.65),rgba(30,27,75,.65)), url(${c.hero_image})`, backgroundSize: "cover" } : undefined}
          >
            <p className="text-xl font-extrabold leading-tight">{c.hero_title}</p>
            <p className="mt-2 text-sm text-white/85">{c.hero_subtitle}</p>
          </div>
          <div className="space-y-2 p-4">
            <p className="font-bold">{c.description_title}</p>
            <p className="line-clamp-4 text-sm text-slate-600">{c.description}</p>
            <span className="btn-primary pointer-events-none w-full">{c.cta_text}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
