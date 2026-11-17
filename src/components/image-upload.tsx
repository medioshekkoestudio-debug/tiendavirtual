"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, ImagePlus, Loader2, X } from "lucide-react";
import type { Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { cropToBlob, ImageCropper } from "./image-cropper";

const MAX_BYTES = 3 * 1024 * 1024;
/** Con recorte la foto se vuelve a guardar más liviana, así que se acepta la foto del teléfono tal cual */
const MAX_BYTES_CROP = 20 * 1024 * 1024;

/** Formas de recorte según dónde se va a ver la foto */
export const CROP_PRODUCT = { aspect: 1, maxWidth: 1200, title: "Recorta la foto del producto" };
export const CROP_SLIDER = { aspect: 5 / 2, maxWidth: 1800, title: "Recorta la foto del slide" };
export const CROP_ABOUT = { aspect: 4 / 3, maxWidth: 1200, title: "Recorta la foto de «Quiénes somos»" };
export const CROP_GALLERY = { aspect: 1, maxWidth: 1200, title: "Recorta la foto de la galería" };

export type CropSpec = { aspect: number; maxWidth: number; title?: string };

export function ImageUpload({
  value,
  onChange,
  userId,
  folder,
  label,
  hint,
  className,
  fit = "cover",
  crop,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  folder: string;
  label?: string;
  hint?: string;
  className?: string;
  fit?: "cover" | "contain";
  /** Si se da, al elegir la foto se abre el recortador con esta forma */
  crop?: CropSpec;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Foto abierta en el recortador (nueva: blob local; ya subida: su URL) */
  const [cropping, setCropping] = useState<string | null>(null);

  // Libera la foto local cuando se deja de usar
  useEffect(() => () => { if (cropping?.startsWith("blob:")) URL.revokeObjectURL(cropping); }, [cropping]);

  async function upload(body: Blob, ext: string, contentType: string) {
    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("store-assets").upload(path, body, {
      cacheControl: "31536000",
      contentType,
    });
    setBusy(false);
    if (upErr) return setError("No se pudo subir: " + upErr.message);
    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    onChange(data.publicUrl);
  }

  function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("El archivo debe ser una imagen");
    if (file.size > (crop ? MAX_BYTES_CROP : MAX_BYTES)) return setError(`La imagen supera ${crop ? 20 : 3} MB`);
    if (crop) return setCropping(URL.createObjectURL(file));
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    void upload(file, ext, file.type);
  }

  async function finishCrop(area: Area) {
    if (!cropping || !crop) return;
    try {
      const blob = await cropToBlob(cropping, area, crop.maxWidth);
      setCropping(null);
      await upload(blob, "jpg", "image/jpeg");
    } catch {
      setCropping(null);
      setError("No se pudo recortar esta foto. Prueba subiéndola de nuevo.");
    }
  }

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-brand hover:text-brand",
          className,
        )}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain p-2")} />
        ) : (
          <div className="flex flex-col items-center gap-1 p-3 text-center text-xs font-medium">
            <ImagePlus className="size-6" />
            Subir imagen
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        )}
        {value && !busy && (
          <button
            type="button"
            aria-label="Quitar imagen"
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
        {value && !busy && crop && (
          <button
            type="button"
            aria-label="Recortar imagen"
            title="Recortar"
            className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white"
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
              setCropping(value);
            }}
          >
            <Crop className="size-3.5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {cropping && crop && (
        <ImageCropper src={cropping} aspect={crop.aspect} title={crop.title} onCancel={() => setCropping(null)} onDone={finishCrop} />
      )}
    </div>
  );
}
