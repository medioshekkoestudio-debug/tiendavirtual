import { Landmark, MapPin, Smartphone } from "lucide-react";
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS } from "@/lib/constants";
import type { PaymentMethodKey, Store } from "@/lib/types";

/** Insignia de cada método de pago (sin imágenes externas: se ve igual en todas las tiendas). */
function MethodBadge({ k }: { k: PaymentMethodKey }) {
  const base = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold shadow-sm";
  switch (k) {
    case "zelle":
      return <span className={`${base} bg-[#6D1ED4] text-white`}>Zelle</span>;
    case "paypal":
      return (
        <span className={`${base} border border-slate-200 bg-white italic`}>
          <span className="text-[#003087]">Pay</span>
          <span className="-ml-1.5 text-[#009CDE]">Pal</span>
        </span>
      );
    case "binance":
      return (
        <span className={`${base} bg-[#F3BA2F] text-[#1E2026]`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
            <path d="M12 3l2.6 2.6L9.2 11 6.6 8.4zM16.4 7.4L19 10l-7 7-2.6-2.6zM4.6 10.4L7.2 13 4.6 15.6 2 13zM19.4 10.4L22 13l-2.6 2.6L16.8 13zM12 15.4l2.6 2.6L12 20.6 9.4 18z" />
          </svg>
          Binance
        </span>
      );
    case "pago_movil":
      return (
        <span className={`${base} border border-slate-200 bg-white text-slate-800`}>
          <Smartphone className="size-4 text-brand" aria-hidden /> Pago Móvil
        </span>
      );
    case "transferencia":
      return (
        <span className={`${base} border border-slate-200 bg-white text-slate-800`}>
          <Landmark className="size-4 text-brand" aria-hidden /> Transferencia
        </span>
      );
  }
}

/**
 * Dirección (solo en el inicio, si la tienda la puso) + métodos de pago que activó la tienda + copyright y aviso de
 * responsabilidad. Va antes del pie de la tienda.
 */
export function StoreLegal({ store, address }: { store: Pick<Store, "name" | "payment_methods">; address?: string | null }) {
  const methods = PAYMENT_METHOD_KEYS.filter((k) => store.payment_methods?.[k]?.enabled);
  const year = new Date().getFullYear();
  const place = address?.trim();
  return (
    <section className="mt-14 border-t border-slate-200 px-4 pt-8 text-center" aria-label="Métodos de pago y aviso legal">
      {place && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dirección</p>
          <p className="mx-auto mt-3 flex max-w-md items-start justify-center gap-2 text-sm font-medium text-slate-800">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {place}
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-brand underline"
          >
            Ver en el mapa
          </a>
        </div>
      )}
      {methods.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Métodos de pago</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {methods.map((k) => (
              <li key={k} aria-label={PAYMENT_METHODS[k].label}>
                <MethodBadge k={k} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-6 text-sm font-medium text-slate-700">
        © {year} {store.name}. Todos los derechos reservados.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-500">
        {store.name} es responsable de los productos, precios, existencias, envíos, garantías y atención que ofrece en esta tienda.
        Linki App solo provee la plataforma tecnológica y no es parte de las compras ni responde por ellas.
      </p>
    </section>
  );
}
