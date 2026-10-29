"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { DEFAULT_CATEGORIES, RUBROS, isRubro } from "@/lib/constants";
import { addCategoryTree, createCategory, deleteCategory, renameCategory } from "@/lib/store-actions";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Selector de categorías sugeridas + creación de categorías propias (usado en el onboarding).
 * Con rubro: sugiere las categorías de ese rubro, ya marcadas. Sin rubro (tiendas antiguas): las genéricas, sin marcar.
 */
export function DefaultCategoryPicker({
  onSaved,
  existing,
  industry,
}: {
  onSaved?: () => void;
  existing: Category[];
  industry?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const suggested = isRubro(industry) ? RUBROS[industry].categories : DEFAULT_CATEGORIES;
  const [tree, setTree] = useState(() =>
    suggested.map((c) => ({
      name: c.name,
      selected: isRubro(industry) || existing.some((e) => !e.parent_id && e.name === c.name),
      open: false,
      subcategories: c.subcategories.map((s) => ({ name: s, selected: true })),
    })),
  );
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<number, string>>({});

  const update = (i: number, fn: (n: (typeof tree)[number]) => (typeof tree)[number]) =>
    setTree((t) => t.map((n, j) => (j === i ? fn(n) : n)));

  function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    setTree((t) => [...t, { name, selected: true, open: true, subcategories: [] }]);
    setNewCat("");
  }

  function addSub(i: number) {
    const name = (newSub[i] ?? "").trim();
    if (!name) return;
    update(i, (n) => ({ ...n, selected: true, subcategories: [...n.subcategories, { name, selected: true }] }));
    setNewSub((s) => ({ ...s, [i]: "" }));
  }

  function save() {
    setError(null);
    const payload = tree
      .filter((n) => n.selected)
      .map((n) => ({ name: n.name, subcategories: n.subcategories.filter((s) => s.selected).map((s) => s.name) }));
    startTransition(async () => {
      const res = await addCategoryTree(payload);
      if (res.error) return setError(res.error);
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Marca las categorías que aplican a tu negocio. Puedes crear las tuyas y añadir subcategorías.</p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {tree.map((n, i) => (
          <li key={i} className="p-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={n.selected ? "Quitar" : "Seleccionar"}
                onClick={() => update(i, (x) => ({ ...x, selected: !x.selected }))}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md border-2",
                  n.selected ? "border-brand bg-brand text-on-brand" : "border-slate-300",
                )}
              >
                {n.selected && <Check className="size-4" />}
              </button>
              <span className="flex-1 font-medium">{n.name}</span>
              <span className="text-xs text-slate-500">{n.subcategories.filter((s) => s.selected).length} sub</span>
              <button type="button" className="rounded-lg p-1 hover:bg-slate-100" onClick={() => update(i, (x) => ({ ...x, open: !x.open }))}>
                <ChevronDown className={cn("size-5 transition", n.open && "rotate-180")} />
              </button>
            </div>
            {n.open && (
              <div className="mt-3 space-y-2 pl-9">
                <div className="flex flex-wrap gap-2">
                  {n.subcategories.map((s, j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() =>
                        update(i, (x) => ({
                          ...x,
                          subcategories: x.subcategories.map((y, k) => (k === j ? { ...y, selected: !y.selected } : y)),
                        }))
                      }
                      className={cn(
                        "chip border",
                        s.selected ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-500 line-through",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input py-1.5"
                    placeholder="Nueva subcategoría"
                    value={newSub[i] ?? ""}
                    onChange={(e) => setNewSub((s) => ({ ...s, [i]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSub(i))}
                  />
                  <button type="button" className="btn-outline py-1.5" onClick={() => addSub(i)}>
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="+ Crear categoría (ej. Accesorios para mascotas)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
        />
        <button type="button" className="btn-outline whitespace-nowrap" onClick={addCategory}>
          <Plus className="size-4" /> Nueva categoría
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="button" className="btn-primary" onClick={save} disabled={pending}>
        {pending ? "Guardando…" : "Guardar categorías"}
      </button>
    </div>
  );
}

/** Gestión de categorías existentes (crear, renombrar, eliminar). */
export function CategoryManager({ categories, productCounts }: { categories: Category[]; productCounts?: Record<string, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const parents = categories.filter((c) => !c.parent_id);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  const row = (c: Category, isSub: boolean) => (
    <div key={c.id} className={cn("flex items-center gap-2 py-1.5", isSub && "pl-6")}>
      {editing === c.id ? (
        <>
          <input className="input py-1" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <button
            type="button"
            aria-label="Guardar nombre"
            className="btn-primary px-3 py-1"
            onClick={() => {
              setEditing(null);
              run(() => renameCategory(c.id, editName));
            }}
          >
            <Check className="size-4" />
          </button>
        </>
      ) : (
        <>
          <span className={cn("flex-1 text-sm", !isSub && "font-semibold")}>{c.name}</span>
          {productCounts && <span className="chip bg-slate-100 text-slate-600">{productCounts[c.id] ?? 0}</span>}
          <button
            type="button"
            aria-label="Renombrar"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            onClick={() => {
              setEditing(c.id);
              setEditName(c.name);
            }}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Eliminar"
            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
            onClick={() => confirm(`¿Eliminar "${c.name}"${isSub ? "" : " y sus subcategorías"}?`) && run(() => deleteCategory(c.id))}
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-3", pending && "opacity-60")}>
      {parents.length === 0 && <p className="text-sm text-slate-500">Aún no tienes categorías.</p>}
      <ul className="space-y-2">
        {parents.map((p) => (
          <li key={p.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            {row(p, false)}
            {categories.filter((c) => c.parent_id === p.id).map((s) => row(s, true))}
            <div className="flex gap-2 pl-6 pt-1">
              <input
                className="input py-1 text-xs"
                placeholder="+ Nueva subcategoría"
                value={newSub[p.id] ?? ""}
                onChange={(e) => setNewSub((s) => ({ ...s, [p.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = newSub[p.id] ?? "";
                    setNewSub((s) => ({ ...s, [p.id]: "" }));
                    run(() => createCategory(v, p.id));
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline px-2.5 py-1"
                aria-label="Agregar subcategoría"
                onClick={() => {
                  const v = newSub[p.id] ?? "";
                  setNewSub((s) => ({ ...s, [p.id]: "" }));
                  run(() => createCategory(v, p.id));
                }}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="input" placeholder="Nombre de la nueva categoría" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <button
          type="button"
          className="btn-primary whitespace-nowrap"
          onClick={() => {
            const v = newCat;
            setNewCat("");
            run(() => createCategory(v, null));
          }}
        >
          <Plus className="size-4" /> Crear categoría
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
