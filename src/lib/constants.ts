import type { LandingContent, OrderStatus, PaymentMethodKey, PaymentStatus } from "./types";

export const SITE_DOMAIN = "shopuxapp.com";

/** Recomendación para las imágenes del slider principal (ocupa 25 % del alto de pantalla). */
export const SLIDER_HINT = "Tamaño recomendado: 1920 × 480 px (proporción 4:1), JPG o WebP, máx. 1 MB. Mantén el texto importante en el centro.";
export const SLIDER_SLOTS = 3;

export const DEFAULT_CATEGORIES: { name: string; subcategories: string[] }[] = [
  { name: "Moda", subcategories: ["Ropa de mujer", "Ropa de hombre", "Calzado", "Accesorios"] },
  { name: "Electrónica", subcategories: ["Teléfonos", "Computadoras", "Audio", "Accesorios"] },
  { name: "Hogar", subcategories: ["Muebles", "Decoración", "Cocina", "Limpieza"] },
  { name: "Alimentos y bebidas", subcategories: ["Snacks", "Bebidas", "Víveres", "Postres"] },
  { name: "Belleza y salud", subcategories: ["Maquillaje", "Cuidado de la piel", "Perfumes", "Suplementos"] },
  { name: "Deportes", subcategories: ["Ropa deportiva", "Equipos", "Suplementos"] },
  { name: "Servicios", subcategories: ["Consultoría", "Reparaciones", "Clases", "Delivery"] },
];

export type PaymentField = { key: string; label: string; placeholder?: string; type?: string };

export const PAYMENT_METHODS: Record<PaymentMethodKey, { label: string; fields: PaymentField[] }> = {
  zelle: {
    label: "Zelle",
    fields: [
      { key: "email", label: "Email de Zelle", type: "email", placeholder: "pagos@empresa.com" },
      { key: "holder", label: "Nombre del titular" },
    ],
  },
  paypal: {
    label: "PayPal",
    fields: [
      { key: "link", label: "Link PayPal.me", placeholder: "https://paypal.me/tuempresa" },
      { key: "email", label: "Email de PayPal", type: "email" },
    ],
  },
  pago_movil: {
    label: "Pago móvil",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Banesco (0134)" },
      { key: "id_number", label: "Cédula o RIF", placeholder: "J-12345678-9" },
      { key: "phone", label: "Teléfono", placeholder: "0414-1234567" },
      { key: "holder", label: "Nombre" },
    ],
  },
  binance: {
    label: "Binance",
    fields: [
      { key: "pay_id", label: "Binance Pay ID" },
      { key: "email", label: "Email de Binance", type: "email" },
      { key: "holder", label: "Nombre / usuario" },
    ],
  },
  transferencia: {
    label: "Transferencia bancaria",
    fields: [
      { key: "id_number", label: "RIF o Cédula" },
      { key: "email", label: "Correo", type: "email" },
      { key: "account", label: "Número de cuenta", placeholder: "0102-0000-00-0000000000" },
      { key: "bank", label: "Nombre del banco" },
      { key: "holder", label: "Nombre del titular" },
    ],
  },
};

export const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS) as PaymentMethodKey[];

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  pagado: { label: "Pagado", className: "bg-sky-100 text-sky-800" },
  enviado: { label: "Enviado", className: "bg-indigo-100 text-indigo-800" },
  entregado: { label: "Entregado", className: "bg-emerald-100 text-emerald-800" },
  cancelado: { label: "Cancelado", className: "bg-rose-100 text-rose-800" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  aprobado: { label: "Aprobado", className: "bg-emerald-100 text-emerald-800" },
  rechazado: { label: "Rechazado", className: "bg-rose-100 text-rose-800" },
};

export const PAID_STATUSES: OrderStatus[] = ["pagado", "enviado", "entregado"];

export const PERIODS = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
  anio: "Año",
  todo: "Todo",
} as const;
export type PeriodKey = keyof typeof PERIODS;

export const COLOR_PRESETS = [
  { name: "Violeta", primary: "#7c3aed", secondary: "#1e1b4b", accent: "#f59e0b" },
  { name: "Océano", primary: "#0284c7", secondary: "#0c4a6e", accent: "#22d3ee" },
  { name: "Bosque", primary: "#16a34a", secondary: "#14532d", accent: "#facc15" },
  { name: "Coral", primary: "#f43f5e", secondary: "#4c0519", accent: "#fb923c" },
  { name: "Carbón", primary: "#111827", secondary: "#374151", accent: "#eab308" },
  { name: "Café", primary: "#92400e", secondary: "#451a03", accent: "#d97706" },
];

export const DEFAULT_LANDING: LandingContent = {
  brand_name: "Shopux",
  hero_title: "Crea tu tienda online en minutos",
  hero_subtitle: "Tu propia app (PWA) con catálogo, pedidos, pagos y chat con tus clientes. Sin programar.",
  hero_image: "",
  description_title: "¿Qué es Shopux?",
  description:
    "Shopux es un marketplace de tiendas: cada empresa obtiene su propia tienda instalable en el teléfono, con su marca, sus colores y su link (shopuxapp.com/tuempresa). Administra productos, stock, pagos (Zelle, PayPal, Pago móvil, Binance, transferencias) y pedidos desde un solo panel.",
  cta_text: "Crear mi tienda gratis",
  features: [
    { title: "Tu marca, tu app", text: "Logo, colores, tipografía y slider propios. Tus clientes la instalan como app." },
    { title: "Pagos locales", text: "Zelle, PayPal, Pago móvil, Binance y transferencias. Aprueba cada pago con un toque." },
    { title: "Pedidos y chat", text: "Controla pedidos por categoría y conversa con tus clientes en tiempo real." },
  ],
  footer_text: "© Shopux.app — Marketplace de tiendas",
};
