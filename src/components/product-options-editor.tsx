"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  DEFAULT_MEASURES,
  DEFAULT_SIZES,
  newModelId,
  sizeChoices,
  type ProductMeasure,
  type ProductModel,
  type ProductOptions,
  type Sizing,
} from "@/lib/product-options";
import { cn } from "@/lib/utils";
import { CROP_PRODUCT, ImageUpload } from "./image-upload";

const numOrNull = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));

/** Editor de un producto completo: modelos (foto + precio opcional) y tallas o medidas. */
export function ProductOptionsEditor({
  value,
  onChange,
  basePrice,
  userId,
}: {
  value: ProductOptions;
  onChange: (v: ProductOptions) => void;
  basePrice: number;
  userId: string;
}) {
  const models = value.models ?? [];
  const sizing: Sizing = value.sizing ?? "none";
  const sizes = value.sizes ?? [];
  const measures = value.measures ?? [];
  const choices = sizeChoices(value);
  const [newSize, setNewSize] = useState("");

  const patch = (p: Partial<ProductOptions>) => onChange({ ...value, ...p });
  const setModel = (i: number, p: Partial<ProductModel>) => patch({ models: models.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  const setMeasure = (i: number, p: Partial<ProductMeasure>) => patch({ measures: measures.map((m, j) => (j === i ? { ...m, ...p } : m)) });

  function chooseSizing(s: Sizing) {
    patch({
      sizing: s,
      sizes: s === "tallas" && !sizes.length ? [...DEFAULT_SIZES] : sizes,
      measures: s === "medidas" && !measures.length ? DEFAULT_MEASURES.map((m) => ({ ...m })) : measures,
      // Al cambiar de tallas a medidas, cada modelo vuelve a tener todas
      models: models.map((m) => ({ ...m, sizes: null })),
    });
  }

  function addSize() {
    const s = newSize.trim().slice(0, 20);
    if (!s || sizes.includes(s)) return setNewSize("");
    patch({ sizes: [...sizes, s] });
    setNewSize("");
  }

  function removeChoice(name: string) {
    const models2 = models.map((m) => (m.sizes ? { ...m, sizes: m.sizes.filter((x) => x !== name) } : m));
    if (sizing === "tallas") patch({ sizes: sizes.filter((x) => x !== name), models: models2 });
    else patch({ measures: measures.filter((x) => x.name !== name), models: models2 });
  }

  function toggleModelChoice(i: number, name: string) {
    const current = models[i].sizes ?? choices;
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name];
    // Si tiene todas, se guarda null (así las tallas nuevas también le aplican)
    setModel(i, { sizes: choices.every((c) => next.includes(c)) ? null : choices.filter((c) => next.includes(c)) });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      {/* Modelos */}
      <section className="space-y-3">
        <div>
          <p className="font-semibold">Modelos</p>
          <p className="text-xs text-slate-500">Colores, estampados o versiones. Cada uno con su foto; el precio es opcional.</p>
        </div>
        {models.map((m, i) => (
          <div key={m.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex gap-3">
              <ImageUpload
                value={m.image_url}
                onChange={(u) => setModel(i, { image_url: u })}
                userId={userId}
                folder="products"
                className="aspect-square w-20 shrink-0"
                crop={CROP_PRODUCT}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  className="input"
                  placeholder="Nombre del modelo (ej. Azul)"
                  aria-label={`Nombre del modelo ${i + 1}`}
                  value={m.name}
                  onChange={(e) => setModel(i, { name: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={`Precio: igual al general ($${basePrice || 0})`}
                  aria-label={`Precio del modelo ${i + 1} (opcional)`}
                  value={m.price ?? ""}
                  onChange={(e) => setModel(i, { price: numOrNull(e.target.value) })}
                />
              </div>
              <button
                type="button"
                className="self-start rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                aria-label={`Quitar modelo ${m.name || i + 1}`}
                onClick={() => patch({ models: models.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {choices.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">
                  {sizing === "tallas" ? "Tallas" : "Medidas"} de este modelo
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {choices.map((c) => {
                    const on = (m.sizes ?? choices).includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleModelChoice(i, c)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium",
                          on ? "border-brand bg-brand text-on-brand" : "border-slate-300 bg-white text-slate-400 line-through",
                        )}
                        aria-pressed={on}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn-outline w-full"
          onClick={() => patch({ models: [...models, { id: newModelId(), name: "", image_url: null, price: null, sizes: null }] })}
        >
          <Plus className="size-4" /> Agregar modelo
        </button>
      </section>

      {/* Tallas o medidas */}
      <section className="space-y-3">
        <p className="font-semibold">Tallas o medidas</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1 text-sm font-medium">
          {(
            [
              ["none", "Ninguna"],
              ["tallas", "Tallas"],
              ["medidas", "Medidas"],
            ] as [Sizing, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => chooseSizing(k)}
              className={cn("rounded-lg py-1.5", sizing === k ? "bg-white shadow-sm" : "text-slate-600")}
              aria-pressed={sizing === k}
            >
              {label}
            </button>
          ))}
        </div>

        {sizing === "tallas" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white py-1 pl-2.5 pr-1 text-sm font-medium">
                  {s}
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:text-rose-500" aria-label={`Quitar talla ${s}`} onClick={() => removeChoice(s)}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Otra talla (ej. XXL, 38, Única)"
                aria-label="Nueva talla"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSize();
                  }
                }}
              />
              <button type="button" className="btn-outline shrink-0" onClick={addSize}>
                <Plus className="size-4" /> Agregar
              </button>
            </div>
          </div>
        )}

        {sizing === "medidas" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Ancho, largo y profundidad en centímetros; deja vacío lo que no aplique.</p>
            {measures.map((m, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Nombre (ej. Grande)"
                    aria-label={`Nombre de la medida ${i + 1}`}
                    value={m.name}
                    onChange={(e) => {
                      const name = e.target.value.slice(0, 40);
                      // El nombre identifica la medida en cada modelo: se renombra también allí
                      const models2 = models.map((x) => (x.sizes ? { ...x, sizes: x.sizes.map((s) => (s === m.name ? name : s)) } : x));
                      patch({ measures: measures.map((y, j) => (j === i ? { ...y, name } : y)), models: models2 });
                    }}
                  />
                  <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label={`Quitar medida ${m.name || i + 1}`} onClick={() => removeChoice(m.name)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["width", "Ancho"],
                      ["length", "Largo"],
                      ["depth", "Profundidad"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="text-xs font-medium text-slate-600">
                      {label} (cm)
                      <input
                        className="input mt-0.5"
                        type="number"
                        min={0}
                        step="0.1"
                        value={m[k] ?? ""}
                        onChange={(e) => setMeasure(i, { [k]: numOrNull(e.target.value) })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn-outline w-full"
              onClick={() => patch({ measures: [...measures, { name: "", width: null, length: null, depth: null }] })}
            >
              <Plus className="size-4" /> Agregar medida
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
