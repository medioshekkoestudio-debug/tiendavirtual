"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { product_id: string; name: string; price: number; image_url: string | null; quantity: number; stock: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
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
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  }, [items, key, loaded]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((list) => {
      const found = list.find((i) => i.product_id === item.product_id);
      if (found) {
        return list.map((i) => (i.product_id === item.product_id ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
      }
      return [...list, { ...item, quantity: Math.min(qty, item.stock) }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((list) =>
      list.flatMap((i) => (i.product_id !== id ? [i] : qty <= 0 ? [] : [{ ...i, quantity: Math.min(qty, i.stock) }])),
    );
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.quantity, 0),
      total: items.reduce((a, i) => a + i.quantity * i.price, 0),
      add,
      setQty,
      remove: (id) => setItems((l) => l.filter((i) => i.product_id !== id)),
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
