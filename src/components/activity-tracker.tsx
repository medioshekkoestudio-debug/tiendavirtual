"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logVisit } from "@/lib/activity-actions";

const EVERY_MS = 30 * 60_000;

/** Registra qué pantallas usa el dueño (cada pantalla como mucho una vez cada 30 min) para el Superadmin */
export function ActivityTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const key = `linki:visita:${pathname}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < EVERY_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Sin almacenamiento: se registra igual
    }
    void logVisit(pathname);
  }, [pathname]);
  return null;
}
