"use client";

import { useEffect } from "react";
import { listenForInstall } from "@/lib/pwa";

// También fuera del efecto: el navegador puede lanzar `beforeinstallprompt` antes de que React hidrate
// y ese evento no se repite.
listenForInstall();

export function RegisterSW() {
  useEffect(() => {
    listenForInstall();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
