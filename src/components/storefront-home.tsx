"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Category, Product, Store } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { useCart } from "./cart";
import { StoreSlider } from "./store-slider";

export function ProductCard({ product, href, compact }: { product: Product; href?: string; compact?: boolean }) {
  const cart = useCart();
  const out = product.stock <= 0;
  const body = (
    <>
      <div className="relative">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" loading="lazy" />
        ) : (
          <div className="font-brand grid aspect-square w-full place-items-center bg-brand/10 text-3xl font-bold text-brand">{product.name[0]}</div>
        )}
        {out && <span className="absolute left-2 top-2 chip bg-slate-900/80 text-white">Agotado</span>}
      </div>
      <div className="p-2.5">
        <p className={cn("font-brand line-clamp-2 font-semibold leading-snug", compact ? "text-sm" : "text-[15px]")}>{product.name}</p>
        <p className="mt-1 font-bold text-brand">{formatMoney(product.price)}</p>
      </div>
    </>
  );
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {href ? <Link href={href}>{body}</Link> : body}
      {cart && !out && (
        <button
          type="button"
          aria-label={`Agregar ${product.name} al carrito`}
          onClick={() =>
            cart.add({ product_id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, stock: product.stock })
          }
          className="absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-brand text-on-brand shadow transition active:scale-90"
        >
          <Plus className="size-4" />
        </button>
      )}
    </div>
  );
}

export function StorefrontHome({
  store,
  products,
  categories,
  linkBase,
}: {
  store: Pick<Store, "name" | "description" | "slider_images">;
  products: Product[];
  categories: Category[];
  /** Base de links a la ficha de producto, p. ej. "/empresax". Sin valor = no navega (vista previa). */
  linkBase?: string;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const parents = categories.filter((c) => !c.parent_id);
  const href = (p: Product) => (linkBase ? `${linkBase}/producto/${p.id}` : undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category_id === cat) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, cat]);

  const carousels = parents
    .map((c) => ({ cat: c, items: products.filter((p) => p.category_id === c.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="pb-4">
      <StoreSlider images={store.slider_images} storeName={store.name} />

      {store.description && (
        <section className="px-4 pt-5">
          <h1 className="font-brand text-2xl font-bold">{store.name}</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{store.description}</p>
        </section>
      )}

      <div className="sticky top-14 z-10 space-y-2 bg-slate-50/95 px-4 pb-2 pt-4 backdrop-blur">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar productos" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {parents.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {[{ id: null as string | null, name: "Todo" }, ...parents].map((c) => (
              <button
                key={c.id ?? "all"}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition",
                  cat === c.id ? "border-brand bg-brand text-on-brand" : "border-slate-200 bg-white text-slate-700",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query && !cat &&
        carousels.map(({ cat: c, items }) => (
          <section key={c.id} className="pt-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="font-brand text-lg font-bold">{c.name}</h2>
              <button type="button" className="text-sm font-semibold text-brand" onClick={() => setCat(c.id)}>Ver todo</button>
            </div>
            <div className="no-scrollbar mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {items.slice(0, 10).map((p) => (
                <div key={p.id} className="w-40 shrink-0 snap-start">
                  <ProductCard product={p} href={href(p)} compact />
                </div>
              ))}
            </div>
          </section>
        ))}

      <section className="px-4 pt-6">
        <h2 className="font-brand mb-3 text-lg font-bold">
          {cat ? parents.find((c) => c.id === cat)?.name : query ? "Resultados" : "Todos los productos"}
        </h2>
        {filtered.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} href={href(p)} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">No encontramos productos.</p>
        )}
      </section>
    </div>
  );
}
