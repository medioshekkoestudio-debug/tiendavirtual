"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Slider principal de la tienda (por defecto 25 % del alto de la pantalla). */
export function StoreSlider({
  images,
  storeName,
  heightClass = "h-[25vh] min-h-36",
}: {
  images: string[];
  storeName: string;
  heightClass?: string;
}) {
  const slides = images.length ? images : [null];
  const [rawIndex, setIndex] = useState(0);
  const index = rawIndex % slides.length;

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className={cn("relative w-full overflow-hidden bg-brand-2", heightClass)}>
      <div className="flex h-full transition-transform duration-700" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((src, i) =>
          src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`${storeName} — slide ${i + 1}`} className="h-full w-full shrink-0 object-cover" />
          ) : (
            <div
              key={i}
              className="font-brand flex h-full w-full shrink-0 items-center justify-center bg-gradient-to-r from-brand to-brand-2 px-6 text-center text-2xl font-bold text-on-brand"
            >
              {storeName}
            </div>
          ),
        )}
      </div>
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir al slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn("h-1.5 rounded-full bg-white/90 transition-all", i === index ? "w-6" : "w-1.5 opacity-60")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
