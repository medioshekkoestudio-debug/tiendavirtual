"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

// Marca en este navegador que ya hay una cuenta (se pone al entrar al panel). Así la landing le muestra
// «Iniciar sesión» a quien ya se registró y «Crea tu tienda» a quien nunca lo hizo.
const KEY = "linki-tiene-cuenta";

export function MarkHasAccount() {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Navegación privada: no pasa nada
    }
  }, []);
  return null;
}

/** Botones de la barra de la landing: siempre «Iniciar sesión» (para todas las tiendas) y «Crea tu tienda».
 *  A quien ya tuvo cuenta en este navegador se le resalta el inicio de sesión. */
export function LandingAuthButtons() {
  const [hasAccount, setHasAccount] = useState(false);
  useEffect(() => {
    try {
      setHasAccount(localStorage.getItem(KEY) === "1");
    } catch {
      // Sin almacenamiento: se muestran los dos botones igual
    }
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <Link href="/login" className={cn(hasAccount ? "btn-primary" : "btn-outline", "whitespace-nowrap px-3 sm:px-4")}>
        <LogIn className="hidden size-4 sm:block" />
        <span className="sm:hidden">Entrar</span>
        <span className="hidden sm:inline">Iniciar sesión</span>
      </Link>
      <Link href="/suscripcion" className={cn(hasAccount ? "btn-outline" : "btn-primary", "whitespace-nowrap px-3 sm:px-4")}>
        Crea tu tienda
      </Link>
    </div>
  );
}
