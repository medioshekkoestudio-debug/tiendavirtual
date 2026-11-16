"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  /** product_id + modelo + talla: cada combinación es una línea del carrito */
  key: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock: number;
  model_id?: string;
  size?: string;
  /** «Azul · Talla M» */
  variant?: string;
};

const lineKey = (i: { product_id: string; model_id?: string; size?: string }) => [i.product_id, i.model_id ?? "", i.size ?? ""].join("|");

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity" | "key">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ storeSlug, children }: { storeSlug: string; children: React.ReactNode }) {
  const key = `shopux:cart:${storeSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setItems((JSON.parse(raw) as CartItem[]).map((i) => ({ ...i, key: i.key || lineKey(i) })));
    } catch {}
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  }, [items, key, loaded]);

  const add = useCallback((input: Omit<CartItem, "quantity" | "key">, qty = 1) => {
    const item = { ...input, key: lineKey(input) };
    setItems((list) => {
      const found = list.find((i) => i.key === item.key);
      if (found) {
        return list.map((i) => (i.key === item.key ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
      }
      return [...list, { ...item, quantity: Math.min(qty, item.stock) }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((list) =>
      list.flatMap((i) => (i.key !== id ? [i] : qty <= 0 ? [] : [{ ...i, quantity: Math.min(qty, i.stock) }])),
    );
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.quantity, 0),
      total: items.reduce((a, i) => a + i.quantity * i.price, 0),
      add,
      setQty,
      remove: (id) => setItems((l) => l.filter((i) => i.key !== id)),
      clear: () => setItems([]),
    }),
    [items, add, setQty],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Devuelve null fuera de una tienda (p. ej. en la vista previa del panel). */
export function useCart() {
  return useContext(Ctx);
}
