"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Proporción del recortador (2,5:1). Es también la más BAJA permitida: el slide nunca queda más bajo que esto.
 *  La más alta es 5:4 (fotos cuadradas o verticales se ven completas sobre su copia desenfocada). */
const DEFAULT_RATIO = 5 / 2;
const MIN_RATIO = 5 / 4;
const MAX_RATIO = DEFAULT_RATIO;

/**
 * Slider principal de la tienda (todos los planes). Toma la forma de su primera foto (ancho ÷ alto, entre 5:4 y 2,5:1):
 * así la foto se ve completa y a todo el ancho. Las fotos del recortador son 2,5:1 (como siempre); las subidas antes
 * (p. ej. 4:3 o cuadradas) ya no quedan pequeñas en una franja con bordes borrosos, y las muy alargadas (4:1) no
 * dejan el slide más bajo que 2,5:1. En PC el alto tiene tope para no ocupar toda la pantalla.
 * Si las fotos tienen formas distintas, las demás se ven completas sobre su propia copia desenfocada.
 */
export function StoreSlider({ images, storeName }: { images: string[]; storeName: string }) {
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const first = useRef<HTMLImageElement>(null);
  const measure = (img: HTMLImageElement | null) => {
    if (!img?.naturalWidth || !img.naturalHeight) return;
    setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, img.naturalWidth / img.naturalHeight)));
  };
  // La foto puede terminar de cargar antes de que React tome el control (onLoad no llega): se mide al montar
  useEffect(() => {
    if (first.current?.complete) measure(first.current);
  }, [images[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const slides = images.length ? images : [null];
  const [rawIndex, setIndex] = useState(0);
  const index = rawIndex % slides.length;
  const touchX = useRef<number | null>(null);
  const go = (i: number) => setIndex(((i % slides.length) + slides.length) % slides.length);

  // Avanza solo cada 4,5 s. Depende del índice: si la persona desliza o toca un punto, la cuenta vuelve a empezar
  // (antes podía saltar al siguiente un instante después de elegir uno)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % slides.length);
      else setTick((n) => n + 1); // pestaña oculta: no avanza, pero vuelve a contar
    }, 4500);
    return () => clearTimeout(t);
  }, [rawIndex, tick, slides.length]);

  return (
    <div
      className="relative w-full touch-pan-y overflow-hidden bg-brand-2"
      style={{ aspectRatio: String(ratio), maxHeight: "min(70vh, 520px)" }}
      // Deslizar con el dedo: izquierda = siguiente, derecha = anterior
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || slides.length < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex h-full transition-transform duration-700" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((src, i) =>
          src ? (
            // Imagen completa (object-contain) sobre una copia desenfocada de sí misma que rellena los bordes
            // cuando la tienda sube una imagen con otra proporción (vertical, cuadrada, 4:1…). A 2,5:1 llena todo el banner.
            <div key={i} className="relative h-full w-full shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={i === 0 ? first : undefined}
                onLoad={i === 0 ? (e) => measure(e.currentTarget) : undefined}
                src={src}
                alt={`${storeName} — slide ${i + 1}`}
                className="relative size-full object-contain"
              />
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
              onClick={() => go(i)}
              className={cn("h-1.5 rounded-full bg-white/90 transition-all", i === index ? "w-6" : "w-1.5 opacity-60")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
