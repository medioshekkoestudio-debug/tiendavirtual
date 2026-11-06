"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { confirmAdult } from "./actions";

/**
 * Tienda no apta para menores: antes de ver los artículos el cliente confirma que es mayor de edad.
 * La confirmación queda registrada (la tienda la ve en Ajustes) y este navegador la recuerda un año.
 */
export function AgeGate({ slug, name, logoUrl }: { slug: string; name: string; logoUrl: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accept = () =>
    startTransition(async () => {
      setError(null);
      const res = await confirmAdult(slug);
      if (res.error) return setError(res.error);
      router.refresh();
    });

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="edad-titulo" className="card w-full max-w-sm p-6 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto size-16 rounded-2xl object-contain" />
        ) : (
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand/10 text-brand">
            <ShieldAlert className="size-8" />
          </span>
        )}
        <p className="mt-3 font-brand text-lg font-bold">{name}</p>
        <h1 id="edad-titulo" className="mt-4 text-xl font-bold">Solo para mayores de edad</h1>
        <p className="mt-2 text-slate-600">
          Esta tienda ofrece artículos para mayores de 18 años. Para ver sus productos confirma que eres mayor de edad.
        </p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 space-y-2">
          <button type="button" className="btn-primary w-full py-3 text-base" disabled={pending} onClick={accept}>
            {pending ? "Entrando…" : "Soy mayor de edad, entrar"}
          </button>
          <a href="/" className="btn-outline w-full">
            Soy menor de edad, salir
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">Al entrar declaras que tienes 18 años o más. Tu confirmación queda registrada.</p>
      </div>
    </div>
  );
}
