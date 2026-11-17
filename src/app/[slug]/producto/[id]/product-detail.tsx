"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Expand, Minus, Plus, Share2, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart";
import { ImageViewer } from "@/components/image-zoom";
import { whatsAppShareUrl } from "@/components/share-whatsapp";
import { choicesFor, measureText, variantLabel, type ProductModel } from "@/lib/product-options";
import type { Product } from "@/lib/types";
import { cn, formatBs, formatMoney, toBs } from "@/lib/utils";

export function ProductDetail({ product, slug, bsRate }: { product: Product; slug: string; bsRate: number | null }) {
  const cart = useCart();
  const complete = product.product_type === "complete";
  const opts = useMemo(() => (complete ? product.options ?? {} : {}), [complete, product.options]);
  const models = opts.models ?? [];
  const [model, setModel] = useState<ProductModel | null>(models[0] ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  /** Foto elegida en las miniaturas (null = la del modelo elegido o la principal) */
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La ficha siempre abre desde arriba: en el iPhone el navegador a veces conserva el desplazamiento de la página
  // anterior y la parte de arriba de la foto (con la flecha de volver) quedaba escondida debajo de la barra
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [product.id]);

  // WhatsApp directo: el amigo recibe el enlace a la vista de este producto (con su foto, por la vista previa)
  function shareWhatsApp() {
    const url = window.location.origin + window.location.pathname;
    const message = `¡Mira este producto! 👀 ${product.name}${model ? ` (${model.name})` : ""} — ${formatMoney(price)}\n${url}`;
    window.open(whatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  }

  // Compartir: en el teléfono abre su menú (WhatsApp, Instagram…); donde no existe, va directo a WhatsApp
  async function share() {
    const url = window.location.origin + window.location.pathname;
    const data = { title: product.name, text: `¡Mira este producto! 👀 ${product.name} — ${formatMoney(price)}`, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    shareWhatsApp();
  }

  // Galería: la foto principal, las fotos adicionales y la de cada modelo (sin repetir)
  const images = useMemo(() => {
    const list: { src: string; alt: string; modelId?: string }[] = [];
    if (product.image_url) list.push({ src: product.image_url, alt: product.name });
    (product.images ?? []).forEach((src, i) => {
      if (src && !list.some((x) => x.src === src)) list.push({ src, alt: `${product.name} — foto ${i + 2}` });
    });
    for (const m of models) {
      if (m.image_url && !list.some((i) => i.src === m.image_url)) list.push({ src: m.image_url, alt: `${product.name} — ${m.name}`, modelId: m.id });
    }
    return list;
  }, [product.image_url, product.images, product.name, models]);
  const shownSrc = photo || model?.image_url || product.image_url || images[0]?.src || null;
  const shownIndex = Math.max(0, images.findIndex((i) => i.src === shownSrc));

  const choices = choicesFor(opts, model);
  const price = model?.price != null ? Number(model.price) : Number(product.price);
  const sizeLabel = opts.sizing === "medidas" ? "Medida" : "Talla";

  function pickModel(m: ProductModel) {
    setModel(m);
    setPhoto(null);
    setAdded(false);
    if (size && !choicesFor(opts, m).includes(size)) setSize(null);
  }

  function add() {
    if (!cart) return;
    if (choices.length && !size) return setError(`Elige ${opts.sizing === "medidas" ? "una medida" : "una talla"}`);
    setError(null);
    const label = complete ? variantLabel(opts, model, size) : "";
    cart.add(
      {
        product_id: product.id,
        name: product.name,
        price,
        // En el carrito, la foto del modelo o la principal (no la miniatura que se estaba mirando)
        image_url: model?.image_url || product.image_url || shownSrc,
        stock: product.stock,
        ...(complete && (model || size) ? { model_id: model?.id, size: size ?? undefined, variant: label } : {}),
      },
      qty,
    );
    setAdded(true);
  }

  return (
    <div className="pb-6">
      <div className="relative">
        {shownSrc ? (
          <button type="button" className="block w-full cursor-zoom-in" onClick={() => setViewer(shownIndex)} aria-label="Ampliar foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownSrc} alt={model ? `${product.name} — ${model.name}` : product.name} className="aspect-square w-full object-cover sm:aspect-[4/3]" />
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
              <Expand className="size-3.5" /> Ampliar
            </span>
          </button>
        ) : (
          <div className="font-brand grid aspect-[4/3] w-full place-items-center bg-brand/10 text-6xl font-bold text-brand">{product.name[0]}</div>
        )}
        {/* A la derecha: a la izquierda la tapaba el logo de la tienda, que sobresale de la barra superior */}
        <Link href={`/${slug}`} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow" aria-label="Volver">

          <ArrowLeft className="size-5" />
        </Link>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {images.map((im) => (
            <button
              key={im.src}
              type="button"
              // Una miniatura pasa a la foto grande (la grande se toca para ampliar); la de un modelo además lo elige
              onClick={() => {
                const m = models.find((x) => x.id === im.modelId);
                if (m) pickModel(m);
                else setPhoto(im.src);
              }}
              className={cn("shrink-0 overflow-hidden rounded-xl border-2", im.src === shownSrc ? "border-brand" : "border-transparent")}
              aria-label={`Ver ${im.alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt="" className="size-16 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 px-4 pt-4">
        {/* Compartir junto al nombre, en el color de la tienda: sobre la foto se perdía en las fotos claras */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-brand text-2xl font-bold">{product.name}</h1>
          <button
            type="button"
            onClick={share}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand shadow-md transition active:scale-90"
            aria-label="Compartir producto"
            title="Compartir"
          >
            <Share2 className="size-5" />
          </button>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-brand">{formatMoney(price)}</p>
          {bsRate && <p className="text-sm font-medium text-slate-500">{formatBs(toBs(price, bsRate))}</p>}
        </div>
        <p className={product.stock > 0 ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>
          {product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}
        </p>

        {models.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">
              Modelo: <span className="font-normal text-slate-600">{model?.name}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickModel(m)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-white p-1.5 pr-3 text-sm",
                    model?.id === m.id ? "border-brand ring-2 ring-brand/30" : "border-slate-300",
                  )}
                >
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" className="size-9 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-lg bg-brand/10 font-bold text-brand">{m.name[0]}</span>
                  )}
                  <span className="text-left">
                    <span className="block font-medium">{m.name}</span>
                    {m.price != null && Number(m.price) !== Number(product.price) && (
                      <span className="block text-xs text-slate-500">{formatMoney(m.price)}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {choices.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">{sizeLabel}</p>
            <div className="flex flex-wrap gap-2">
              {choices.map((c) => {
                const m = opts.sizing === "medidas" ? opts.measures?.find((x) => x.name === c) : null;
                const dims = m ? measureText(m) : "";
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSize(c);
                      setError(null);
                      setAdded(false);
                    }}
                    className={cn(
                      "rounded-xl border bg-white px-3 py-2 text-sm font-medium",
                      size === c ? "border-brand bg-brand text-on-brand" : "border-slate-300",
                    )}
                  >
                    {c}
                    {dims && <span className={cn("block text-[11px] font-normal", size === c ? "opacity-90" : "text-slate-500")}>{dims}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {product.description && <p className="whitespace-pre-line leading-relaxed text-slate-700">{product.description}</p>}

        {cart && product.stock > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-slate-300 bg-white">
                <button type="button" className="p-3" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button type="button" className="p-3" aria-label="Más" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>
                  <Plus className="size-4" />
                </button>
              </div>
              <button type="button" className="btn-primary flex-1 py-3" onClick={add}>
                <ShoppingCart className="size-5" /> Agregar al carrito
              </button>
            </div>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            {added && (
              <Link href={`/${slug}/checkout`} className="btn-outline w-full">
                Agregado ✓ — Ir a pagar
              </Link>
            )}
          </div>
        )}
      </div>

      {viewer !== null && images.length > 0 && <ImageViewer images={images} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
