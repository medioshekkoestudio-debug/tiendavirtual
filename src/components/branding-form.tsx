"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COLOR_PRESETS, SLIDER_HINT, SLIDER_SLOTS } from "@/lib/constants";
import { saveBranding } from "@/lib/store-actions";
import type { Store } from "@/lib/types";
import { FontPicker } from "./font-picker";
import { ImageUpload } from "./image-upload";
import { StoreSlider } from "./store-slider";
import { themeStyle } from "./theme-vars";

export function BrandingForm({
  store,
  userId,
  submitLabel = "Guardar",
  onSaved,
}: {
  store: Store;
  userId: string;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: store.name,
    description: store.description,
    logo_url: store.logo_url,
    primary_color: store.primary_color,
    secondary_color: store.secondary_color,
    accent_color: store.accent_color,
    font_key: store.font_key,
    slider_images: Array.from({ length: SLIDER_SLOTS }, (_, i) => store.slider_images[i] ?? null) as (string | null)[],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveBranding(form);
      if (res.error) return setError(res.error);
      setSaved(true);
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-8" style={themeStyle(form)}>
      <section className="space-y-4">
        <h3 className="text-lg font-bold">Logo y nombre</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ImageUpload
            value={form.logo_url}
            onChange={(u) => set("logo_url", u)}
            userId={userId}
            folder="logo"
            className="size-28 shrink-0"
            fit="contain"
            hint="PNG con fondo transparente, 512×512 px."
          />
          <div className="flex-1">
            <label className="label" htmlFor="store-name">Nombre de la empresa</label>
            <input id="store-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">Colores de tu app</h3>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-medium hover:border-slate-400"
              onClick={() => setForm((f) => ({ ...f, primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent }))}
            >
              <span className="flex">
                {[p.primary, p.secondary, p.accent].map((c) => (
                  <span key={c} className="-ml-1 size-5 rounded-full border-2 border-white first:ml-0" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["primary_color", "Principal"],
              ["secondary_color", "Secundario"],
              ["accent_color", "Acento"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium">
              <input
                type="color"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent"
              />
              {label}
              <span className="font-mono text-slate-500">{form[key]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-bold">Slider principal (3 imágenes)</h3>
          <p className="text-sm text-slate-600">
            El slider ocupa el <strong>25 %</strong> del alto de la pantalla. {SLIDER_HINT}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {form.slider_images.map((img, i) => (
            <ImageUpload
              key={i}
              label={`Slide ${i + 1}`}
              value={img}
              userId={userId}
              folder="slider"
              className="aspect-[4/1] w-full"
              onChange={(u) => set("slider_images", form.slider_images.map((x, j) => (j === i ? u : x)))}
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <StoreSlider images={form.slider_images.filter((x): x is string => !!x)} storeName={form.name} heightClass="h-32" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">Tipografía</h3>
        <FontPicker value={form.font_key} onChange={(k) => set("font_key", k)} sample={form.name} />
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold">Descripción de tu empresa</h3>
        <textarea
          className="input min-h-28"
          maxLength={2000}
          placeholder="Cuéntales a tus clientes quiénes son, qué venden y por qué elegirlos."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">Cambios guardados ✓</span>}
      </div>
    </div>
  );
}
