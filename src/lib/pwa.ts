// Descargar la app (PWA) en el teléfono. Misma lógica que La Mejor Llave (lib/pwa/instalar.ts):
//  - El navegador avisa UNA sola vez por carga con `beforeinstallprompt`, y solo si alguien ya escucha.
//    Por eso la escucha se enciende desde el layout raíz (RegisterSW) y el evento queda guardado.
//  - En iPhone ese evento no existe: se instala a mano desde Compartir → «Añadir a pantalla de inicio».
//  - Chrome exige un service worker con `fetch` (public/sw.js lo tiene).

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let saved: InstallPromptEvent | null = null;
let listening = false;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Enciende la escucha (llamarla de más no hace nada). */
export function listenForInstall() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    // Sin esto el navegador muestra su barrita cuando quiere; así el botón es nuestro
    e.preventDefault();
    saved = e as InstallPromptEvent;
    notify();
  });
  // También llega si la instalan desde el menú del navegador
  window.addEventListener("appinstalled", () => {
    saved = null;
    installed = true;
    notify();
  });
}

export type InstallState = { canPrompt: boolean; installed: boolean };

/** Avisa cada vez que cambia. Devuelve el corte. */
export function subscribeInstall(fn: (s: InstallState) => void) {
  const run = () => fn({ canPrompt: !!saved, installed });
  listeners.add(run);
  run();
  return () => {
    listeners.delete(run);
  };
}

/** Abre el diálogo del navegador. 'unavailable' = no hay evento. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!saved) return "unavailable";
  await saved.prompt();
  const { outcome } = await saved.userChoice;
  // El evento es de un solo uso
  if (outcome === "accepted") {
    saved = null;
    installed = true;
    notify();
  }
  return outcome;
}

export type Platform = "ios" | "android" | "desktop";

export function platform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // El iPad moderno se hace pasar por Mac; se delata por el táctil
  const iPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || iPad) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** ¿Ya está abierta como app (no como pestaña del navegador)? */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
