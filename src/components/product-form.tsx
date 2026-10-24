"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProduct, type ProductInput } from "@/lib/store-actions";
import type { Category, Product } from "@/lib/types";
import { ImageUpload } from "./image-upload";

export function ProductForm({
  product,
  categories,
  userId,
  onDone,
}: {
  product?: Product | null;
  categories: Category[];
  userId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInput>({
    id: product?.id,
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    stock: product?.stock ?? 1,
    category_id: product?.category_id ?? null,
    subcategory_id: product?.subcategory_id ?? null,
    image_url: product?.image_url ?? null,
    is_active: product?.is_active ?? true,
  });
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const parents = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id && c.parent_id === form.category_id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveProduct(form);
      if (res.error) return setError(res.error);
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ImageUpload
        label="Imagen del producto"
        value={form.image_url}
        onChange={(u) => set("image_url", u)}
        userId={userId}
        folder="products"
        className="aspect-square w-40"
        hint="Cuadrada, 800×800 px recomendado."
      />
      <div>
        <label className="label" htmlFor="p-name">Nombre</label>
        <input id="p-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-desc">Descripción</label>
        <textarea id="p-desc" className="input min-h-20" value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="p-price">Precio (USD)</label>
          <input
            id="p-price"
            className="input"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.price}
            onChange={(e) => set("price", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label" htmlFor="p-stock">Stock</label>
          <input
            id="p-stock"
            className="input"
            type="number"
            min={0}
            step="1"
            required
            value={form.stock}
            onChange={(e) => set("stock", Number(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="p-cat">Categoría</label>
          <select
            id="p-cat"
            className="input"
            value={form.category_id ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null, subcategory_id: null }))}
          >
            <option value="">Sin categoría</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-sub">Subcategoría</label>
          <select
            id="p-sub"
            className="input"
            value={form.subcategory_id ?? ""}
            disabled={!subs.length}
            onChange={(e) => set("subcategory_id", e.target.value || null)}
          >
            <option value="">—</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
        Visible en la tienda
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Guardando…" : product ? "Guardar cambios" : "Agregar producto"}
      </button>
    </form>
  );
}
