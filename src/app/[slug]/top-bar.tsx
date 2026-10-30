"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { useCart } from "@/components/cart";
import { InstallAppButton } from "@/components/install-app";
import { initials } from "@/lib/utils";

export function StoreTopBar({
  slug,
  name,
  logoUrl,
  user,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  user: { name: string } | null;
}) {
  const cart = useCart();
  const [menu, setMenu] = useState(false);
  const base = `/${slug}`;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* 3 columnas: logo a la izquierda, nombre centrado (aunque los botones de la derecha cambien de ancho), acciones a la derecha */}
      <div className="mx-auto grid h-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <Link href={base} className="justify-self-start" aria-label={`Inicio de ${name}`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-9 rounded-xl object-contain" />
          ) : (
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-on-brand">{initials(name)}</span>
          )}
        </Link>
        <Link href={base} className="min-w-0 max-w-[55vw] text-center sm:max-w-md">
          <span className="font-brand block truncate text-lg font-bold text-brand">{name}</span>
        </Link>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
        <InstallAppButton appName={name} iconOnly className="text-slate-700" />

        <Link href={`${base}/checkout`} className="relative rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Carrito">
          <ShoppingCart className="size-5" />
          {!!cart?.count && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
              {cart.count}
            </span>
          )}
        </Link>

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className="grid size-9 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand"
              aria-label="Mi cuenta"
            >
              {initials(user.name)}
            </button>
            {menu && (
              // El formulario de cerrar sesión debe seguir montado al hacer clic: cerrar el menú solo desde el enlace
              <div className="absolute right-0 top-11 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-slate-500">{user.name}</p>
                <Link href={`${base}/compras`} onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                  <ShoppingBag className="size-4" /> Mis compras
                </Link>
                <form action={signOut}>
                  <input type="hidden" name="next" value={base} />
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          // En el teléfono solo el icono, para dejarle espacio al nombre centrado
          <Link href={`${base}/login`} className="btn-outline px-2 py-1.5 text-xs sm:px-3" aria-label="Iniciar sesión">
            <User className="size-4" /> <span className="hidden sm:inline">Iniciar sesión</span>
          </Link>
        )}
        </div>
      </div>
    </header>
  );
}
