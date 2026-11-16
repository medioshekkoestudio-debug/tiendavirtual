"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

type Img = { src: string; alt: string };

const MIN = 1;
const MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Visor a pantalla completa: doble toque / clic para ampliar, pellizcar o rueda para hacer zoom,
 * arrastrar para mover y flechas para pasar entre fotos.
 */
export function ImageViewer({ images, index, onIndex, onClose }: { images: Img[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const img = images[index];

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };
  const zoomTo = (s: number) => {
    const next = clamp(s, MIN, MAX);
    setScale(next);
    if (next === 1) setPos({ x: 0, y: 0 });
  };
  const go = (d: number) => {
    if (images.length < 2) return;
    reset();
    onIndex((index + d + images.length) % images.length);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  });

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      zoomTo((pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (scale > 1) setPos({ x: d.px + dx, y: d.py + dy });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    // Sin zoom, deslizar a los lados cambia de foto
    if (scale === 1 && Math.abs(dx) > 60) return go(dx < 0 ? 1 : -1);
    if (d.moved) return;
    const now = Date.now();
    const double = now - lastTap.current < 300 || e.pointerType === "mouse";
    lastTap.current = now;
    if (!double) return;
    if (scale > 1) return reset();
    // Amplía hacia el punto tocado
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    setScale(2.5);
    setPos({ x: -cx * 1.5, y: -cy * 1.5 });
  }

  if (!img) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={img.alt}>
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="text-sm text-white/70">{images.length > 1 ? `${index + 1} / ${images.length}` : ""}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Alejar" onClick={() => zoomTo(scale - 0.75)}>
            <ZoomOut className="size-5" />
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Acercar" onClick={() => zoomTo(scale + 0.75)}>
            <ZoomIn className="size-5" />
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar" onClick={onClose}>
            <X className="size-6" />
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoomTo(scale - e.deltaY * 0.002)}
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={img.alt}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-75"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 hover:bg-white/25"
              aria-label="Foto anterior"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => go(-1)}
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 hover:bg-white/25"
              aria-label="Foto siguiente"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => go(1)}
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="p-3 text-center text-xs text-white/60">Toca dos veces o pellizca para hacer zoom</p>
    </div>,
    document.body,
  );
}
