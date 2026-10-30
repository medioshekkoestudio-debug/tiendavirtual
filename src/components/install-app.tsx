"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { Modal } from "@/components/modal";
import { isStandalone, platform, promptInstall, subscribeInstall, type Platform } from "@/lib/pwa";
import { cn } from "@/lib/utils";

/**
 * Botón «Descargar app» con su aviso (como AvisoApp de La Mejor Llave):
 *  - Android/Chrome con evento: un toque instala y sale «¡App descargada!».
 *  - iPhone: aviso con los dos pasos de Safari (no hay otra forma).
 *  - Android sin evento: una línea con el menú ⋮.
 *  - Computadora: la dirección para abrirla en el teléfono.
 * Si ya se abrió como app, el botón no aparece.
 */
export function InstallAppButton({
  appName,
  className,
  label = "Descargar app",
  iconOnly = false,
}: {
  appName: string;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [canPrompt, setCanPrompt] = useState(false);
  const [done, setDone] = useState(false);
  const [where, setWhere] = useState<Platform>("desktop");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHidden(isStandalone());
    setWhere(platform());
    return subscribeInstall((s) => {
      setCanPrompt(s.canPrompt);
      if (s.installed) setDone(true);
    });
  }, []);

  if (hidden) return null;

  const install = async () => {
    setBusy(true);
    try {
      if ((await promptInstall()) === "accepted") setDone(true);
    } finally {
      setBusy(false);
    }
  };

  // En Android con evento se instala de un toque, sin abrir el aviso primero
  const onClick = async () => {
    if (canPrompt && !done) {
      setOpen(true);
      await install();
    } else setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(iconOnly ? "rounded-xl p-2 text-slate-600 hover:bg-slate-100" : "btn-outline", className)}
        aria-label={label}
        title={label}
      >
        <Download className={iconOnly ? "size-5" : "size-4"} />
        {!iconOnly && <span>{label}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={done ? "¡App descargada!" : `Descarga la app de ${appName}`}>
        {done ? (
          <div className="space-y-3 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-7" />
            </span>
            <p className="text-slate-700">
              Listo, la app de <strong>{appName}</strong> ya está en tu teléfono. Ábrela desde su ícono en la pantalla de inicio.
            </p>
            <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>
              Entendido
            </button>
          </div>
        ) : (
          <InstallHelp where={where} canPrompt={canPrompt} busy={busy} onInstall={install} />
        )}
      </Modal>
    </>
  );
}

function InstallHelp({ where, canPrompt, busy, onInstall }: { where: Platform; canPrompt: boolean; busy: boolean; onInstall: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  if (canPrompt) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700">Se abre a pantalla completa, carga más rápido y la tienes a un toque.</p>
        <button type="button" className="btn-primary w-full" onClick={onInstall} disabled={busy}>
          <Download className="size-4" /> {busy ? "Descargando…" : "Descargar la app"}
        </button>
      </div>
    );
  }

  if (where === "ios") {
    return (
      <div className="space-y-4">
        <p className="text-slate-700">En iPhone la app se agrega desde Safari, en dos toques:</p>
        <ol className="space-y-3">
          <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-600 shadow-sm">
              <Share className="size-5" />
            </span>
            <span>
              Toca <strong>Compartir</strong> (el cuadrito con la flecha hacia arriba), abajo en Safari.
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-700 shadow-sm">
              <SquarePlus className="size-5" />
            </span>
            <span>
              Elige <strong>«Añadir a pantalla de inicio»</strong> y luego <strong>Añadir</strong>.
            </span>
          </li>
        </ol>
        <p className="text-xs text-slate-500">Si no ves Compartir, abre esta página en Safari.</p>
      </div>
    );
  }

  if (where === "android") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-700 shadow-sm">
          <EllipsisVertical className="size-5" />
        </span>
        <p className="text-slate-700">
          Abre el menú <strong>⋮</strong> de tu navegador y toca <strong>«Instalar app»</strong> o <strong>«Agregar a la pantalla principal»</strong>.
        </p>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // La dirección está a la vista
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-slate-700">Estás en una computadora. Abre esta dirección en tu teléfono para descargar la app ahí:</p>
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1 font-mono text-sm" value={url} readOnly onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-outline shrink-0" onClick={copy} aria-label="Copiar la dirección">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
