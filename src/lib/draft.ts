"use client";

// Borradores en este navegador. En el teléfono, al ir a WhatsApp u otra app el sistema puede cerrar la página
// para liberar memoria; al volver se recarga y se perdería lo escrito. Esto lo guarda en localStorage (también
// sobrevive si cierran la app) y lo devuelve al volver. Caduca en 24 h y se borra al terminar (clearDraft).

import { useEffect, useRef, useState, type RefObject } from "react";

const TTL_MS = 24 * 60 * 60 * 1000;

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - at > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Sin almacenamiento (navegación privada): no se guarda
  }
}

/** Borra el borrador indicado y todos los que empiezan por `${key}:` */
export function clearDraft(key: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k === key || k.startsWith(`${key}:`)) localStorage.removeItem(k);
  } catch {}
}

/** useState que se guarda como borrador. key null = no guarda (p. ej. aún no se sabe de quién es) */
export function useDraftState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  // Se lee al montar (no en el render) para no desajustar el HTML que viene del servidor
  useEffect(() => {
    if (!key) return;
    const saved = readDraft<T>(key);
    if (saved !== null) setValue(saved);
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (key && loaded.current) writeDraft(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const SKIP_TYPES = ["password", "file", "hidden", "submit", "button", "reset"];
const fieldKey = (el: Field) => {
  const k = el.name || el.id;
  return el instanceof HTMLInputElement && el.type === "radio" ? `${k}=${el.value}` : k;
};
// Las contraseñas nunca se guardan (aunque el ojo las muestre como texto)
const skip = (el: Field) =>
  !fieldKey(el) || (el instanceof HTMLInputElement && SKIP_TYPES.includes(el.type)) || /password/i.test(el.name || el.id) || "noDraft" in el.dataset;

/** Pone el valor como si lo hubiera escrito la persona, para que React (campos controlados) también lo vea */
function setAsTyped(el: Field, value: string | boolean) {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    if (el.checked !== value) el.click();
    return;
  }
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, String(value));
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/**
 * Guarda y recupera todos los campos dentro de `rootRef` (por name o id), salvo contraseñas y archivos.
 * Sirve para formularios con campos sin estado propio, como los datos de registro.
 */
export function useFormDraft(key: string, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fields = () => Array.from(root.querySelectorAll<Field>("input, textarea, select")).filter((el) => !skip(el));
    // Un momento después de montar: primero se restauran los estados (paso, método…) que cambian los campos visibles
    const restore = setTimeout(() => {
      const saved = readDraft<Record<string, string | boolean>>(key);
      if (!saved) return;
      for (const el of fields()) {
        const v = saved[fieldKey(el)];
        if (v !== undefined && v !== "") setAsTyped(el, v);
      }
    }, 60);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const data: Record<string, string | boolean> = {};
        for (const el of fields()) {
          data[fieldKey(el)] = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? el.checked : el.value;
        }
        writeDraft(key, data);
      }, 300);
    };
    root.addEventListener("input", save);
    root.addEventListener("change", save);
    return () => {
      clearTimeout(restore);
      clearTimeout(timer);
      root.removeEventListener("input", save);
      root.removeEventListener("change", save);
    };
  }, [key, rootRef]);
}
