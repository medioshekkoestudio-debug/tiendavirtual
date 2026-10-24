"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart";
import type { Product } from "@/lib/types";

export function AddToCart({ product, slug }: { product: Product; slug: string }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (!cart || product.stock <= 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-slate-300 bg-white">
          <button type="button" className="p-3" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button type="button" className="p-3" aria-label="Más" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          className="btn-primary flex-1 py-3"
          onClick={() => {
            cart.add({ product_id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, stock: product.stock }, qty);
            setAdded(true);
          }}
        >
          <ShoppingCart className="size-5" /> Agregar al carrito
        </button>
      </div>
      {added && (
        <Link href={`/${slug}/checkout`} className="btn-outline w-full">
          Agregado ✓ — Ir a pagar
        </Link>
      )}
    </div>
  );
}
