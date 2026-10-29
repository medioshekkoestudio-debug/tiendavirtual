"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Slider principal de la tienda. Proporción fija 2,5:1 (igual en teléfono, tablet y PC) para que la imagen
 * subida se vea completa: con un alto en % de pantalla la forma cambiaba y la foto se recortaba distinto en cada equipo.
 */
export function StoreSlider({
  images,
  storeName,
  heightClass = "aspect-[5/2]",
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
            // Imagen completa (object-contain) sobre una copia desenfocada de sí misma que rellena los bordes
            // cuando la tienda sube una imagen con otra proporción (vertical, cuadrada, 4:1…). A 2,5:1 llena todo el banner.
            <div key={i} className="relative h-full w-full shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${storeName} — slide ${i + 1}`} className="relative size-full object-contain" />
            </div>
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
