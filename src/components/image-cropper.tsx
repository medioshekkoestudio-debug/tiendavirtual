"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Minus, Plus, X } from "lucide-react";

/**
 * Ventana para recortar una foto con la forma exacta del recuadro donde se va a ver
 * (cuadrada para productos, 2,5:1 para el slide). Se arrastra para mover y se acerca
 * con dos dedos, la rueda del ratón o la barrita.
 */
export function ImageCropper({
  src,
  aspect,
  title,
  onCancel,
  onDone,
}: {
  src: string;
  aspect: number;
  title?: string;
  onCancel: () => void;
  onDone: (area: Area) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  // Sin desplazar la página de fondo mientras se recorta; Escape cierra
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Recortar imagen">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="font-bold">{title ?? "Recorta tu foto"}</p>
          <p className="text-xs text-slate-500">Arrastra para moverla y acerca con dos dedos o con la barra.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-slate-100" aria-label="Cancelar">
          <X className="size-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-800">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          minZoom={1}
          maxZoom={5}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
          objectFit="contain"
          showGrid
        />
      </div>

      <div className="space-y-3 border-t border-slate-200 px-4 py-3 pb-safe">
        <div className="flex items-center gap-3">
          <button type="button" className="grid size-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
            <Minus className="size-5" />
          </button>
          <input
            type="range"
            min={1}
            max={5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--brand)]"
            aria-label="Acercar o alejar"
          />
          <button type="button" className="grid size-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>
            <Plus className="size-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!area || busy}
            onClick={async () => {
              if (!area) return;
              setBusy(true);
              try {
                await onDone(area);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "Guardando…" : "Usar foto"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Carga una imagen (también de otra web, si lo permite) para dibujarla en un canvas */
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

/**
 * Corta el trozo elegido y lo deja a un tamaño razonable (máximo `maxWidth` de ancho).
 * Sale en JPG con fondo blanco (las PNG transparentes no quedan con fondo negro).
 */
export async function cropToBlob(src: string, area: Area, maxWidth: number): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxWidth / area.width);
  const w = Math.max(1, Math.round(area.width * scale));
  const h = Math.max(1, Math.round(area.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite recortar imágenes");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo recortar la imagen"))), "image/jpeg", 0.88),
  );
}
