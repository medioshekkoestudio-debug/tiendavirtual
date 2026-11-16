"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, QrCode, Search, ShoppingBag, ShoppingCart, User, X } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { useCart } from "@/components/cart";
import { InstallAppButton } from "@/components/install-app";
import { Modal } from "@/components/modal";
import { StoreQr } from "@/components/store-qr";
import { cn, contrastText, initials, storeUrl } from "@/lib/utils";

/** Aclara un color mezclándolo con blanco (0 = igual, 1 = blanco). */
function lighten(hex: string, amount: number) {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex;
  return (
    "#" +
    [0, 2, 4]
      .map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * amount))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Buscador de la barra: en la página del catálogo filtra mientras se escribe (?q=); en otra página, al dar Enter lleva al catálogo. */
function HeaderSearch({ searchHref }: { searchHref: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onCatalog = pathname === searchHref;
  const [value, setValue] = useState(onCatalog ? (params.get("q") ?? "") : "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pushed = useRef(value);
  const urlQuery = onCatalog ? (params.get("q") ?? "") : "";

  // Si el buscador del catálogo cambia ?q=, la barra lo refleja (sin pisar lo que se está escribiendo aquí)
  useEffect(() => {
    if (onCatalog && urlQuery.trim() !== pushed.current.trim()) {
      pushed.current = urlQuery;
      setValue(urlQuery);
    }
  }, [urlQuery, onCatalog]);

  function go(q: string, live: boolean) {
    pushed.current = q;
    const url = q.trim() ? `${searchHref}?q=${encodeURIComponent(q.trim())}` : searchHref;
    if (live) router.replace(url, { scroll: false });
    else {
      router.push(url + "#catalogo");
    }
  }

  function change(q: string) {
    setValue(q);
    if (!onCatalog) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(q, true), 250);
  }

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        go(value, false);
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 opacity-70" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder="Buscar producto"
        aria-label="Buscar producto"
        className="h-9 w-full rounded-full border-0 bg-white/40 pl-8 pr-8 text-base text-current outline-none placeholder:text-current placeholder:opacity-60 focus:bg-white/70 focus:ring-2 focus:ring-white/80 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-70 hover:opacity-100"
          aria-label="Borrar búsqueda"
          onClick={() => {
            clearTimeout(timer.current);
            setValue("");
            if (onCatalog) go("", true);
          }}
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

export function StoreTopBar({
  slug,
  name,
  logoUrl,
  color,
  accent,
  user,
  links,
  searchHref,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  /** Color principal (línea inferior y QR) */
  color: string;
  /** Color de acento sacado del logo: fondo de la barra */
  accent: string;
  user: { name: string } | null;
  /** Páginas de la web (plan Business): en PC van junto al buscador */
  links?: { href: string; label: string }[];
  /** Página donde está el catálogo (el buscador filtra ahí) */
  searchHref: string;
}) {
  const cart = useCart();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const base = `/${slug}`;
  const bg = lighten(accent, 0.3);
  const fg = contrastText(bg);
  const iconBtn = "rounded-xl p-2 transition hover:bg-black/10";

  return (
    <header className="sticky top-0 z-30 h-14 border-b-2 shadow-sm" style={{ background: bg, color: fg, borderColor: color }}>
      <div className={cn("mx-auto flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-4", links ? "max-w-5xl" : "max-w-3xl")}>
        {/* Logo grande en un cuadro blanco que sobresale de la barra; el nombre queda solo para lectores de pantalla */}
        <Link href={base} className="relative z-10 shrink-0 self-start pt-1.5" aria-label={`Inicio de ${name}`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-16 rounded-2xl bg-white object-contain p-1 shadow-md" />
          ) : (
            <span className="font-brand grid size-16 place-items-center rounded-2xl bg-white text-xl font-bold text-brand shadow-md">{initials(name)}</span>
          )}
          <span className="sr-only">{name}</span>
        </Link>

        {links && (
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("rounded-full px-3 py-1.5 text-sm font-semibold transition", pathname === l.href ? "bg-white/70" : "hover:bg-black/10")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <HeaderSearch searchHref={searchHref} />

        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => setQrOpen(true)} className={iconBtn} aria-label="Compartir tienda" title="Compartir tienda">
            <QrCode className="size-5" />
          </button>
          <InstallAppButton appName={name} iconOnly className="text-current" />

          <Link href={`${base}/checkout`} className={cn("relative", iconBtn)} aria-label="Carrito">
            <ShoppingCart className="size-5" />
            {!!cart?.count && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
                {cart.count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-brand shadow-sm"
                aria-label="Mi cuenta"
              >
                {initials(user.name)}
              </button>
              {menu && (
                // El formulario de cerrar sesión debe seguir montado al hacer clic: cerrar el menú solo desde el enlace
                <div className="absolute right-0 top-11 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-lg">
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
            <Link href={`${base}/login`} className="ml-1 grid size-9 place-items-center rounded-full bg-white text-brand shadow-sm" aria-label="Iniciar sesión" title="Iniciar sesión">
              <User className="size-4" />
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
