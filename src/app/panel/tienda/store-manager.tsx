"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, Minus, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { CategoryManager } from "@/components/category-manager";
import { Modal } from "@/components/modal";
import { ProductForm } from "@/components/product-form";
import { StorefrontHome } from "@/components/storefront-home";
import { StatCard } from "@/components/ui";
import { deleteProduct, setProductStock } from "@/lib/store-actions";
import type { Category, Product, Store } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

export function StoreManager({
  store,
  userId,
  bsRate,
  products,
  categories,
  openNew,
  editId,
}: {
  store: Store;
  userId: string;
  bsRate: number | null;
  products: Product[];
  categories: Category[];
  openNew?: boolean;
  editId?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"admin" | "cliente">("admin");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [editing, setEditing] = useState<Product | null | "new">(
    openNew ? "new" : editId ? (products.find((p) => p.id === editId) ?? null) : null,
  );
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const parents = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id && c.parent_id === cat);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) {
      if (p.category_id) m[p.category_id] = (m[p.category_id] ?? 0) + 1;
      if (p.subcategory_id) m[p.subcategory_id] = (m[p.subcategory_id] ?? 0) + 1;
    }
    return m;
  }, [products]);

  const filtered = products.filter(
    (p) =>
      (!cat || p.category_id === cat) &&
      (!sub || p.subcategory_id === sub) &&
      (!query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const totalStock = products.reduce((a, p) => a + p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= 3).length;

  function closeEditor() {
    setEditing(null);
    if (openNew || editId) router.replace("/panel/tienda");
  }

  function commitStock(p: Product) {
    const value = stockDraft[p.id];
    if (value === undefined || value === p.stock) return;
    startTransition(async () => {
      await setProductStock(p.id, value);
      setStockDraft((d) => {
        const { [p.id]: _, ...rest } = d;
        return rest;
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl bg-slate-200/70 p-1">
          {(
            [
              ["admin", "Vista administrador"],
              ["cliente", "Vista cliente"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-sm font-semibold transition",
                view === k ? "bg-white shadow-sm" : "text-slate-600",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href={`/${store.slug}`} target="_blank" className="btn-outline px-3" aria-label="Abrir tienda pública">
          <ExternalLink className="size-4" />
        </Link>
      </div>

      {view === "cliente" ? (
        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-slate-50 shadow-xl">
          <div className="flex h-14 items-center gap-2 border-b bg-white px-4">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt="" className="size-8 rounded-lg object-contain" />
            ) : null}
            <span className="font-brand font-bold">{store.name}</span>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto">
            <StorefrontHome store={store} products={products.filter((p) => p.is_active)} categories={categories} bsRate={bsRate} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Productos" value={products.length} />
            <StatCard label="Unidades en stock" value={totalStock} />
            <StatCard label="Stock bajo (≤3)" value={lowStock} />
          </div>

          <div className="card">
            <button type="button" className="flex w-full items-center justify-between" onClick={() => setShowCats((s) => !s)}>
              <span className="flex items-center gap-2 font-semibold">
                <Settings2 className="size-4" /> Categorías y subcategorías ({parents.length})
              </span>
              <span className="text-sm text-brand">{showCats ? "Ocultar" : "Gestionar"}</span>
            </button>
            {!showCats && (
              <div className="mt-3 flex flex-wrap gap-2">
                {parents.map((c) => (
                  <span key={c.id} className="chip bg-slate-100 text-slate-700">
                    {c.name} · {counts[c.id] ?? 0}
                  </span>
                ))}
              </div>
            )}
            {showCats && (
              <div className="mt-4">
                <CategoryManager categories={categories} productCounts={counts} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="Buscar por nombre" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <button type="button" className="btn-primary" aria-label="Nuevo producto" onClick={() => setEditing("new")}>
                <Plus className="size-4" /> <span className="hidden sm:inline">Nuevo producto</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input"
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setSub("");
                }}
                aria-label="Filtrar por categoría"
              >
                <option value="">Todas las categorías</option>
                {parents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({counts[c.id] ?? 0})
                  </option>
                ))}
              </select>
              <select className="input" value={sub} onChange={(e) => setSub(e.target.value)} disabled={!subs.length} aria-label="Filtrar por subcategoría">
                <option value="">Todas las subcategorías</option>
                {subs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({counts[c.id] ?? 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className={cn("space-y-2", pending && "opacity-70")}>
            {filtered.map((p) => {
              const draft = stockDraft[p.id] ?? p.stock;
              return (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-brand/10 font-bold text-brand">{p.name[0]}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 truncate font-semibold">{p.name}</p>
                      {!p.is_active && (
                        <span className="chip bg-slate-100 text-slate-500">
                          <EyeOff className="size-3" /> Oculto
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {[p.category_id && catName.get(p.category_id), p.subcategory_id && catName.get(p.subcategory_id)].filter(Boolean).join(" › ") ||
                        "Sin categoría"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{formatMoney(p.price)}</span>
                      <div className={cn("flex items-center rounded-lg border", draft <= 3 ? "border-rose-300" : "border-slate-200")}>
                        <button
                          type="button"
                          className="p-1.5"
                          aria-label="Restar stock"
                          onClick={() => setStockDraft((d) => ({ ...d, [p.id]: Math.max(0, draft - 1) }))}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          className="w-12 border-0 bg-transparent text-center text-sm font-semibold outline-none"
                          value={draft}
                          aria-label="Stock"
                          onChange={(e) => setStockDraft((d) => ({ ...d, [p.id]: Math.max(0, Number(e.target.value) || 0) }))}
                        />
                        <button type="button" className="p-1.5" aria-label="Sumar stock" onClick={() => setStockDraft((d) => ({ ...d, [p.id]: draft + 1 }))}>
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      {draft !== p.stock && (
                        <button type="button" className="btn-primary px-2.5 py-1 text-xs" onClick={() => commitStock(p)}>
                          Guardar stock
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Editar" onClick={() => setEditing(p)}>
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                      aria-label="Eliminar"
                      onClick={() =>
                        confirm(`¿Eliminar "${p.name}"?`) &&
                        startTransition(async () => {
                          await deleteProduct(p.id);
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
                {products.length ? "Ningún producto coincide con el filtro." : "Aún no tienes productos. ¡Agrega el primero!"}
              </li>
            )}
          </ul>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Eye className="size-3.5" /> Los productos ocultos no aparecen en tu tienda pública.
          </p>
        </>
      )}

      <Modal open={editing !== null} onClose={closeEditor} title={editing === "new" ? "Nuevo producto" : "Editar producto"}>
        {editing !== null && (
          <ProductForm
            key={editing === "new" ? "new" : editing.id}
            product={editing === "new" ? null : editing}
            categories={categories}
            userId={userId}
            onDone={closeEditor}
          />
        )}
      </Modal>
    </div>
  );
}
