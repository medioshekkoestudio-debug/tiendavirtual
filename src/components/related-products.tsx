"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./storefront-home";

const AUTOPLAY_MS = 3500;

/**
 * Productos relacionados: fila deslizable (scroll horizontal en el teléfono, flechas en PC)
 * que avanza sola cada pocos segundos y se detiene mientras la persona la toca o pasa el mouse.
 */
export function RelatedProducts({ products, base, bsRate }: { products: Product[]; base: string; bsRate: number | null }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  function step(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const w = card ? card.getBoundingClientRect().width + 12 : el.clientWidth / 3;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;
    // Al llegar al final vuelve al principio (y al revés)
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * w, behavior: "smooth" });
  }

  useEffect(() => {
    if (paused || products.length <= 3) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") step(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, products.length]);

  if (!products.length) return null;
  return (
    <section className="mt-10 px-4" aria-label="Productos relacionados">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-brand text-xl font-bold">Productos relacionados</h2>
        {products.length > 3 && (
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full border border-slate-300 bg-white hover:bg-slate-100" aria-label="Anteriores">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full border border-slate-300 bg-white hover:bg-slate-100" aria-label="Siguientes">
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
      <ul
        ref={track}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 4000)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {products.map((p) => (
          // 3 a la vista en el teléfono, 4 en PC
          <li key={p.id} className="shrink-0 basis-[calc((100%-1.5rem)/3)] snap-start sm:basis-[calc((100%-2.25rem)/4)]">
            <ProductCard product={p} href={`${base}/producto/${p.id}`} compact bsRate={bsRate} />
          </li>
        ))}
      </ul>
    </section>
  );
}
