"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

/** Botones de la barra de la landing según si en este navegador ya hubo una cuenta */
export function LandingAuthButtons() {
  const [hasAccount, setHasAccount] = useState(false);
  useEffect(() => {
    try {
      setHasAccount(localStorage.getItem(KEY) === "1");
    } catch {
      // Sin almacenamiento: se muestra «Crea tu tienda»
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      {hasAccount && <Link href="/login" className="btn-ghost">Iniciar sesión</Link>}
      <Link href="/suscripcion" className={cn("btn-primary", hasAccount && "hidden sm:inline-flex")}>
        Crea tu tienda
      </Link>
    </div>
  );
}
