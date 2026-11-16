// Opciones de un producto completo: modelos (foto y precio propio opcional) y tallas o medidas.
// Se guardan en products.options (jsonb). La base valida la elección y el precio en place_order.

export type ProductModel = {
  id: string;
  name: string;
  image_url: string | null;
  /** null = usa el precio general del producto */
  price: number | null;
  /** Tallas o medidas que tiene este modelo; null = todas las del producto */
  sizes: string[] | null;
};

export type ProductMeasure = { name: string; width: number | null; length: number | null; depth: number | null };

export type Sizing = "none" | "tallas" | "medidas";

export type ProductOptions = {
  models?: ProductModel[];
  sizing?: Sizing;
  sizes?: string[];
  measures?: ProductMeasure[];
};

export const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];
export const DEFAULT_MEASURES: ProductMeasure[] = ["Pequeño", "Mediano", "Grande", "Muy grande"].map((name) => ({
  name,
  width: null,
  length: null,
  depth: null,
}));

const MAX_MODELS = 30;
const MAX_CHOICES = 30;

const safeImage = (u: unknown) => (typeof u === "string" && /^https:\/\/[^\s"'<>()\\]+$/.test(u) ? u.slice(0, 1000) : null);
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

export function newModelId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Normaliza lo que llega del navegador o de la base (puede venir incompleto o de versiones viejas). */
export function cleanOptions(src: unknown): Required<ProductOptions> {
  const o = (src && typeof src === "object" ? src : {}) as Record<string, unknown>;
  const sizing: Sizing = o.sizing === "tallas" || o.sizing === "medidas" ? o.sizing : "none";
  const sizes = Array.from(
    new Set((Array.isArray(o.sizes) ? o.sizes : []).map((s) => text(s, 20)).filter(Boolean)),
  ).slice(0, MAX_CHOICES);
  const seen = new Set<string>();
  const measures = (Array.isArray(o.measures) ? o.measures : [])
    .map((m) => {
      const r = (m ?? {}) as Record<string, unknown>;
      return { name: text(r.name, 40), width: num(r.width), length: num(r.length), depth: num(r.depth) };
    })
    .filter((m) => m.name && !seen.has(m.name) && seen.add(m.name))
    .slice(0, MAX_CHOICES);
  const ids = new Set<string>();
  const models = (Array.isArray(o.models) ? o.models : [])
    .map((m) => {
      const r = (m ?? {}) as Record<string, unknown>;
      let id = text(r.id, 20).replace(/[^a-z0-9]/gi, "");
      if (!id || ids.has(id)) id = newModelId();
      ids.add(id);
      return {
        id,
        name: text(r.name, 80),
        image_url: safeImage(r.image_url),
        price: num(r.price),
        sizes: Array.isArray(r.sizes) ? r.sizes.map((s) => text(s, 40)).filter(Boolean) : null,
      };
    })
    .filter((m) => m.name)
    .slice(0, MAX_MODELS);
  return { models, sizing, sizes, measures };
}

/** Lista de tallas o nombres de medidas del producto. */
export function sizeChoices(opts: ProductOptions): string[] {
  if (opts.sizing === "tallas") return opts.sizes ?? [];
  if (opts.sizing === "medidas") return (opts.measures ?? []).map((m) => m.name);
  return [];
}

/** Tallas o medidas disponibles para un modelo (o para el producto si no tiene modelos). */
export function choicesFor(opts: ProductOptions, model: ProductModel | null): string[] {
  const all = sizeChoices(opts);
  return model?.sizes ? all.filter((s) => model.sizes!.includes(s)) : all;
}

export function measureText(m: ProductMeasure) {
  const parts = [
    m.width != null && `ancho ${m.width}`,
    m.length != null && `largo ${m.length}`,
    m.depth != null && `prof. ${m.depth}`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(" × ")} cm` : "";
}

/** Texto de lo elegido, igual al que guarda la base en order_items.variant. */
export function variantLabel(opts: ProductOptions, model: ProductModel | null, size: string | null) {
  const parts: string[] = [];
  if (model) parts.push(model.name);
  if (size && opts.sizing === "tallas") parts.push(`Talla ${size}`);
  if (size && opts.sizing === "medidas") {
    const m = opts.measures?.find((x) => x.name === size);
    const dims = m ? measureText(m) : "";
    parts.push(dims ? `${size} (${dims})` : size);
  }
  return parts.join(" · ");
}

/** El producto pide elegir algo antes de agregarlo al carrito (modelo, talla o medida). */
export function needsChoice(p: { product_type?: string; options?: ProductOptions }) {
  if (p.product_type !== "complete" || !p.options) return false;
  return (p.options.models?.length ?? 0) > 0 || sizeChoices(p.options).length > 0;
}

/** Precio más bajo entre el general y los de los modelos (para mostrar «Desde»). */
export function priceRange(p: { price: number; product_type?: string; options?: ProductOptions }) {
  const base = Number(p.price);
  if (p.product_type !== "complete" || !p.options?.models?.length) return { min: base, max: base };
  const prices = p.options.models.map((m) => (m.price != null ? Number(m.price) : base));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
