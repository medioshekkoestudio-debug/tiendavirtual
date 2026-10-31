"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, QrCode, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { useCart } from "@/components/cart";
import { InstallAppButton } from "@/components/install-app";
import { Modal } from "@/components/modal";
import { StoreQr } from "@/components/store-qr";
import { cn, initials, storeUrl } from "@/lib/utils";

export function StoreTopBar({
  slug,
  name,
  logoUrl,
  color,
  user,
  links,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  color: string;
  user: { name: string } | null;
  /** Páginas de la web (plan Business): en PC van en el centro y el nombre pasa junto al logo */
  links?: { href: string; label: string }[];
}) {
  const cart = useCart();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const base = `/${slug}`;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* 3 columnas: logo a la izquierda, nombre centrado (aunque los botones de la derecha cambien de ancho), acciones a la derecha */}
      <div className={cn("mx-auto grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-4", links ? "max-w-5xl" : "max-w-3xl")}>
        <Link href={base} className="flex min-w-0 items-center gap-2 justify-self-start" aria-label={`Inicio de ${name}`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-9 rounded-xl object-contain" />
          ) : (
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-on-brand">{initials(name)}</span>
          )}
          {links && <span className="font-brand hidden truncate text-lg font-bold text-brand lg:block">{name}</span>}
        </Link>
        <Link href={base} className={cn("min-w-0 max-w-[55vw] text-center sm:max-w-md", links && "lg:hidden")}>
          <span className="font-brand block truncate text-lg font-bold text-brand">{name}</span>
        </Link>
        {links && (
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                  pathname === l.href ? "bg-brand text-on-brand" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center justify-end gap-1 sm:gap-2">
        <button type="button" onClick={() => setQrOpen(true)} className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Compartir tienda" title="Compartir tienda">
          <QrCode className="size-5" />
        </button>
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
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={`Comparte ${name}`}>
        <p className="mb-4 text-center text-sm text-slate-600">Escanea el código o compártelo con tus amigos.</p>
        <StoreQr url={storeUrl(slug)} name={name} slug={slug} logoUrl={logoUrl} color={color} />
      </Modal>
    </header>
  );
}
