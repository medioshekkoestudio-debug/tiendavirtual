// Página web de cada tienda según su plan:
// - Emprendedor: la tienda (slider, descripción y catálogo).
// - Pro: además, presentación con su marca, puntos fuertes, «Quiénes somos» y contacto.
// - Business: una página web completa: inicio tipo landing, catálogo en /tienda y página /nosotros.
// Lo que la tienda deja vacío se completa con los textos sugeridos para su rubro y su descripción.

import { isPlan } from "./constants";
import type { PlanKey, Store } from "./types";

export type SiteTier = PlanKey;
export type IconKey = "star" | "truck" | "shield" | "heart" | "sparkles" | "clock" | "wrench" | "tag" | "chat" | "leaf" | "award" | "smile";

export type Highlight = { title: string; text: string };
export type Testimonial = { name: string; text: string };

export type SiteContent = {
  hero_title?: string;
  hero_subtitle?: string;
  hero_image?: string | null;
  highlights?: Highlight[];
  about_title?: string;
  about_text?: string;
  about_image?: string | null;
  mission?: string;
  vision?: string;
  values?: Highlight[];
  gallery?: string[];
  testimonials?: Testimonial[];
  whatsapp?: string;
  instagram?: string;
  address?: string;
  hours?: string;
};

/** Contenido listo para mostrar: lo editado por la tienda o, si está vacío, lo sugerido */
export type ResolvedSite = Required<Omit<SiteContent, "hero_image" | "about_image">> & {
  hero_image: string | null;
  about_image: string | null;
  icons: IconKey[];
  value_icons: IconKey[];
};

export const HIGHLIGHT_SLOTS = 3;
export const VALUE_SLOTS = 3;
export const GALLERY_SLOTS = 6;
export const TESTIMONIAL_SLOTS = 3;

type RubroCopy = { tagline: string; about: string; highlights: [IconKey, string, string][]; values: [IconKey, string, string][]; mission: string; vision: string };

const GENERIC: RubroCopy = {
  tagline: "Calidad y buena atención en cada compra",
  about: "{name} nació para ofrecerte productos de calidad con una atención cercana. Pide en línea, paga como prefieras y recibe tu pedido sin complicaciones.",
  highlights: [
    ["star", "Calidad garantizada", "Seleccionamos cada producto con cuidado."],
    ["chat", "Atención personalizada", "Escríbenos y te respondemos rápido."],
    ["shield", "Compra segura", "Paga por Pago móvil, Zelle, Binance y más."],
  ],
  values: [
    ["heart", "Compromiso", "Cumplimos lo que prometemos en cada pedido."],
    ["smile", "Cercanía", "Te atendemos como nos gusta que nos atiendan."],
    ["award", "Calidad", "Solo ofrecemos lo que nosotros mismos compraríamos."],
  ],
  mission: "Hacer que comprar en {name} sea fácil, rápido y confiable.",
  vision: "Ser la opción favorita de nuestros clientes por nuestra calidad y atención.",
};

const RUBRO_COPY: Record<string, Partial<RubroCopy>> = {
  automotriz: {
    tagline: "Repuestos y accesorios para que tu vehículo no se detenga",
    about: "En {name} encuentras repuestos, lubricantes y accesorios de confianza, con asesoría para elegir la pieza correcta para tu vehículo.",
    highlights: [
      ["wrench", "Piezas de calidad", "Marcas confiables para cada modelo."],
      ["chat", "Asesoría técnica", "Te ayudamos a encontrar el repuesto exacto."],
      ["truck", "Entregas rápidas", "Coordinamos el envío o el retiro."],
    ],
    mission: "Mantener tu vehículo en marcha con repuestos confiables y asesoría honesta.",
  },
  entretenimiento: {
    tagline: "Diversión para todas las edades",
    about: "{name} reúne juegos, juguetes y artículos de entretenimiento para compartir momentos inolvidables.",
    highlights: [
      ["sparkles", "Novedades", "Siempre lo último en entretenimiento."],
      ["smile", "Para toda la familia", "Opciones para grandes y chicos."],
      ["truck", "Entregas", "Recibe tu pedido sin salir de casa."],
    ],
  },
  ferreteria: {
    tagline: "Todo para construir, reparar y mejorar",
    about: "En {name} tenemos herramientas, materiales y todo lo que necesitas para tus proyectos, con asesoría de quienes conocen el oficio.",
    highlights: [
      ["wrench", "Variedad", "Herramientas y materiales para cada trabajo."],
      ["chat", "Te asesoramos", "Te decimos qué necesitas para tu proyecto."],
      ["tag", "Buenos precios", "Precios justos para profesionales y hogares."],
    ],
  },
  hogar: {
    tagline: "Haz de tu casa tu lugar favorito",
    about: "{name} selecciona artículos de hogar y decoración para que cada espacio se vea y se sienta mejor.",
    highlights: [
      ["sparkles", "Diseño", "Piezas que transforman tus espacios."],
      ["award", "Calidad", "Materiales duraderos y bien terminados."],
      ["truck", "Entregas", "Llevamos tu pedido hasta tu puerta."],
    ],
  },
  mascotas: {
    tagline: "Lo mejor para quienes más te quieren",
    about: "En {name} cuidamos a tus mascotas con alimentos, accesorios y productos seleccionados con cariño.",
    highlights: [
      ["heart", "Con cariño", "Productos pensados en su bienestar."],
      ["leaf", "Alimentos de calidad", "Marcas confiables y nutritivas."],
      ["truck", "Entregas", "Su comida llega a tiempo, sin salir de casa."],
    ],
  },
  moda: {
    tagline: "Tu estilo, tu manera",
    about: "{name} es una boutique con piezas seleccionadas para que te veas y te sientas increíble en cada ocasión.",
    highlights: [
      ["sparkles", "Tendencias", "Colecciones nuevas cada temporada."],
      ["award", "Calidad", "Telas y acabados que duran."],
      ["chat", "Asesoría de tallas", "Te ayudamos a elegir la talla ideal."],
    ],
    values: [
      ["sparkles", "Estilo", "Moda que refleja tu personalidad."],
      ["heart", "Cercanía", "Te atendemos como a una amiga."],
      ["award", "Calidad", "Prendas que te acompañan por años."],
    ],
  },
  panaderia: {
    tagline: "Horneado cada día, con amor",
    about: "En {name} horneamos cada día pan, dulces y tortas con recetas de la casa e ingredientes de calidad. Haz tu pedido y recíbelo fresco.",
    highlights: [
      ["clock", "Recién horneado", "Preparamos tu pedido el mismo día."],
      ["heart", "Receta de la casa", "Sabores que te hacen sentir en casa."],
      ["star", "Tortas por encargo", "Para cumpleaños y ocasiones especiales."],
    ],
    mission: "Endulzar los días de nuestros clientes con productos frescos y hechos con amor.",
  },
  papeleria: {
    tagline: "Todo para estudiar, trabajar y crear",
    about: "{name} tiene útiles escolares, artículos de oficina y libros para que tengas todo lo que necesitas en un solo lugar.",
    highlights: [
      ["tag", "Listas escolares", "Armamos tu lista completa."],
      ["sparkles", "Variedad", "Útiles, oficina, arte y libros."],
      ["truck", "Entregas", "Recibe todo en tu casa u oficina."],
    ],
  },
  salud: {
    tagline: "Cuidamos de ti y de tu familia",
    about: "En {name} te ofrecemos productos de salud y cuidado personal con la confianza y la atención que mereces.",
    highlights: [
      ["shield", "Productos confiables", "Origen y calidad garantizados."],
      ["chat", "Atención cercana", "Resolvemos tus dudas con gusto."],
      ["truck", "Entregas", "Lo que necesitas, cuando lo necesitas."],
    ],
  },
  supermercados: {
    tagline: "Tu mercado completo, sin salir de casa",
    about: "{name} te lleva el mercado a casa: víveres, frescos y artículos del hogar a buenos precios.",
    highlights: [
      ["tag", "Buenos precios", "Ahorra en tu compra del mes."],
      ["leaf", "Frescos", "Productos frescos todos los días."],
      ["truck", "Delivery", "Tu mercado en la puerta de tu casa."],
    ],
  },
  tecnologia: {
    tagline: "Tecnología original, garantía real",
    about: "En {name} encuentras equipos y accesorios tecnológicos originales, con garantía y asesoría para elegir lo que mejor se adapta a ti.",
    highlights: [
      ["shield", "Originales", "Productos con garantía."],
      ["chat", "Asesoría", "Te ayudamos a elegir el equipo ideal."],
      ["truck", "Envíos", "Entregas seguras a todo el país."],
    ],
  },
  telefonia: {
    tagline: "Teléfonos, accesorios y servicio técnico",
    about: "{name} ofrece teléfonos, accesorios y servicio técnico con atención rápida y precios competitivos.",
    highlights: [
      ["shield", "Garantía", "Equipos y reparaciones con garantía."],
      ["wrench", "Servicio técnico", "Reparamos tu equipo rápido."],
      ["tag", "Accesorios", "Forros, cargadores y más."],
    ],
  },
};

/**
 * Plan con el que se muestra la página: site_plan (lo pone el pago aprobado, el cupón o el Superadmin);
 * sin él, el plan pagado vigente; sin plan vigente, Emprendedor.
 */
export function siteTier(store: Pick<Store, "plan" | "plan_expires_at" | "site_plan">, now = Date.now()): SiteTier {
  // Solo en desarrollo: DEV_SITE_TIER=pro|business en .env.local para ver cada diseño sin cambiar el plan
  const dev = process.env.NODE_ENV !== "production" ? process.env.DEV_SITE_TIER : undefined;
  if (dev === "pro" || dev === "business") return dev;
  if (isPlan(store.site_plan)) return store.site_plan;
  if (store.plan && store.plan_expires_at && new Date(store.plan_expires_at).getTime() > now) return store.plan;
  return "emprendedor";
}

export const tierAtLeast = (tier: SiteTier, min: SiteTier) => TIERS.indexOf(tier) >= TIERS.indexOf(min);
const TIERS: SiteTier[] = ["emprendedor", "pro", "business"];

/** Primera oración (o las primeras palabras) de un texto */
function firstSentence(text: string, max = 140) {
  const t = text.trim().replace(/\s+/g, " ");
  const m = t.match(/^.+?[.!?](\s|$)/);
  const s = (m ? m[0] : t).trim();
  return s.length > max ? `${s.slice(0, max).replace(/\s\S*$/, "")}…` : s;
}

const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
const pairs = (list: [IconKey, string, string][]) => list.map(([, title, text]) => ({ title, text }));

/** Textos sugeridos para la tienda (rubro + nombre + descripción). Es lo que se ve si no edita nada. */
export function suggestedSite(store: Pick<Store, "name" | "description" | "industry">): ResolvedSite {
  const copy = { ...GENERIC, ...(store.industry ? RUBRO_COPY[store.industry] : undefined) };
  const fill = (s: string) => s.replaceAll("{name}", store.name);
  const desc = store.description?.trim() ?? "";
  return {
    hero_title: store.name,
    hero_subtitle: desc ? firstSentence(desc) : copy.tagline,
    hero_image: null,
    highlights: pairs(copy.highlights),
    icons: copy.highlights.map(([i]) => i),
    about_title: "Quiénes somos",
    about_text: desc || fill(copy.about),
    about_image: null,
    mission: fill(copy.mission),
    vision: fill(copy.vision),
    values: pairs(copy.values),
    value_icons: copy.values.map(([i]) => i),
    gallery: [],
    testimonials: [],
    whatsapp: "",
    instagram: "",
    address: "",
    hours: "",
  };
}

/** Contenido final: lo que editó la tienda sobre lo sugerido */
export function resolveSite(store: Pick<Store, "name" | "description" | "industry" | "site_content">): ResolvedSite {
  const s = suggestedSite(store);
  const c = (store.site_content ?? {}) as SiteContent;
  const list = (edited: Highlight[] | undefined, base: Highlight[]) =>
    base.map((b, i) => ({ title: pick(edited?.[i]?.title, b.title), text: pick(edited?.[i]?.text, b.text) }));
  return {
    ...s,
    hero_title: pick(c.hero_title, s.hero_title),
    hero_subtitle: pick(c.hero_subtitle, s.hero_subtitle),
    hero_image: safeImage(c.hero_image),
    highlights: list(c.highlights, s.highlights),
    about_title: pick(c.about_title, s.about_title),
    about_text: pick(c.about_text, s.about_text),
    about_image: safeImage(c.about_image),
    mission: pick(c.mission, s.mission),
    vision: pick(c.vision, s.vision),
    values: list(c.values, s.values),
    gallery: (c.gallery ?? []).map(safeImage).filter((u): u is string => !!u).slice(0, GALLERY_SLOTS),
    testimonials: (c.testimonials ?? []).filter((t) => t?.text?.trim() && t?.name?.trim()).slice(0, TESTIMONIAL_SLOTS),
    whatsapp: c.whatsapp?.trim() ?? "",
    instagram: c.instagram?.trim() ?? "",
    address: c.address?.trim() ?? "",
    hours: c.hours?.trim() ?? "",
  };
}

export function safeImage(u: unknown) {
  return typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u.slice(0, 1000) : null;
}

/** Link de WhatsApp a partir del número (0414-1234567 → 58414…) */
export function whatsappLink(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = `58${d.slice(1)}`;
  return d.length >= 10 ? `https://wa.me/${d}` : null;
}

/** Link de Instagram a partir del usuario (@tienda, tienda o la URL del perfil) */
export function instagramLink(handle: string) {
  const h = handle.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? { url: `https://www.instagram.com/${h}`, handle: `@${h}` } : null;
}
