"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { TERMS_PATH } from "@/lib/terms";
import { cn } from "@/lib/utils";

/**
 * Aviso de cookies que sale la primera vez que se entra. `scope` separa la aceptación:
 * la landing y cada tienda la piden una vez cada una. `aboveNav` lo sube por encima de la barra inferior de la tienda.
 */
export function CookieBanner({ scope, name, aboveNav }: { scope: string; name: string; aboveNav?: boolean }) {
  const key = `linki:cookies:${scope}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let accepted = false;
    try {
      accepted = !!localStorage.getItem(key);
    } catch {}
    if (!accepted) accepted = document.cookie.split("; ").some((c) => c.startsWith(`${encodeURIComponent(key)}=`));
    setShow(!accepted);
  }, [key]);

  function accept() {
    try {
      localStorage.setItem(key, new Date().toISOString());
    } catch {}
    // Copia en cookie por si el navegador borra el almacenamiento local
    document.cookie = `${encodeURIComponent(key)}=1; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
    setShow(false);
  }

  if (!show) return null;
  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className={cn(
        "fixed inset-x-3 z-50 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-black/15 sm:flex sm:items-center sm:gap-4",
        aboveNav ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex gap-3">
        <Cookie className="size-6 shrink-0 text-brand" aria-hidden />
        <p className="text-sm text-slate-600">
          {name} usa cookies para que el sitio funcione (sesión, carrito) y para mejorar tu experiencia. Al aceptar, estás de acuerdo con
          su uso.{" "}
          <Link href={TERMS_PATH} className="font-medium text-slate-800 underline">
            Más información
          </Link>
        </p>
      </div>
      <button type="button" className="btn-primary mt-3 w-full shrink-0 sm:mt-0 sm:w-auto" onClick={accept}>
        Aceptar cookies
      </button>
    </div>
  );
}
