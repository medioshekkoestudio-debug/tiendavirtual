"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 3 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  userId,
  folder,
  label,
  hint,
  className,
  fit = "cover",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  folder: string;
  label?: string;
  hint?: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("El archivo debe ser una imagen");
    if (file.size > MAX_BYTES) return setError("La imagen supera 3 MB");
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
    });
    setBusy(false);
    if (upErr) return setError("No se pudo subir: " + upErr.message);
    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    onChange(data.publicUrl);
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
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
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
    </div>
  );
}
