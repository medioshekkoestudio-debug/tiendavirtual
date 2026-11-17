"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CROP_PRODUCT, ImageUpload } from "./image-upload";

export const MAX_PRODUCT_PHOTOS = 11; // la principal + 10 adicionales

/**
 * Fotos del producto. La primera es la principal: la que se ve en la lista de productos, el carrito y al compartir.
 * Con la estrella se elige otra como principal; con la X se quita; con las tijeras se vuelve a recortar.
 */
export function ProductPhotos({
  photos,
  onChange,
  userId,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  userId: string;
}) {
  const replace = (i: number, url: string | null) =>
    onChange(url ? photos.map((p, j) => (j === i ? url : p)) : photos.filter((_, j) => j !== i));
  const makeMain = (i: number) => onChange([photos[i], ...photos.filter((_, j) => j !== i)]);

  return (
    <div>
      <span className="label">Fotos del producto</span>
      <div className="flex flex-wrap gap-3">
        {photos.map((src, i) => (
          <div key={src} className="relative w-28">
            <ImageUpload
              value={src}
              onChange={(u) => replace(i, u)}
              userId={userId}
              folder="products"
              crop={CROP_PRODUCT}
              className={cn("aspect-square w-28", i === 0 && "border-solid border-brand")}
            />
            {i === 0 ? (
              <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-on-brand">
                <Star className="size-3 fill-current" /> Principal
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 p-1.5 text-white"
                aria-label={`Usar la foto ${i + 1} como principal`}
                title="Usar como principal"
              >
                <Star className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {photos.length < MAX_PRODUCT_PHOTOS && (
          <ImageUpload
            // Una casilla vacía nueva cada vez que se agrega una foto
            key={`nueva-${photos.length}`}
            value={null}
            onChange={(u) => u && onChange([...photos, u])}
            userId={userId}
            folder="products"
            crop={CROP_PRODUCT}
            className="aspect-square w-28"
          />
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Hasta {MAX_PRODUCT_PHOTOS} fotos, recortadas en cuadrado. La marcada como <strong>Principal</strong> es la que se ve en la lista de productos;
        toca <Star className="inline size-3" /> en otra para cambiarla.
      </p>
    </div>
  );
}
