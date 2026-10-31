import type { LandingContent, OrderStatus, PaymentMethodKey, PaymentStatus, PlanCycle, PlanKey, PlanPaymentMethodKey } from "./types";

export const SITE_DOMAIN = "linkiapp.com";

/** Recomendación para las imágenes del slider principal (proporción fija 2,5:1, ver store-slider.tsx). */
export const SLIDER_HINT = "Tamaño recomendado: 1500 × 600 px (proporción 2,5:1), JPG o WebP, máx. 1 MB. Se ve completa en teléfono y computadora.";
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

/**
 * Rubros de la inscripción: el dueño elige a qué se dedica su tienda al registrarse (editable en Ajustes).
 * Las claves deben coincidir con el check de stores.industry (migración 20261029130000_rubro_tienda.sql).
 * `categories` son las categorías sugeridas en el onboarding para ese rubro.
 */
export const RUBROS = {
  automotriz: {
    label: "Automotriz y Repuestos",
    categories: [
      { name: "Repuestos", subcategories: ["Motor", "Frenos", "Suspensión", "Eléctricos", "Filtros"] },
      { name: "Lubricantes y fluidos", subcategories: ["Aceites", "Refrigerantes", "Líquido de frenos"] },
      { name: "Cauchos y baterías", subcategories: ["Cauchos", "Baterías", "Rines"] },
      { name: "Accesorios", subcategories: ["Interior", "Exterior", "Audio y luces"] },
      { name: "Servicios", subcategories: ["Mantenimiento", "Diagnóstico", "Instalación"] },
    ],
  },
  entretenimiento: {
    label: "Entretenimiento",
    categories: [
      { name: "Juegos y juguetes", subcategories: ["Videojuegos", "Juegos de mesa", "Juguetes"] },
      { name: "Eventos", subcategories: ["Entradas", "Fiestas", "Alquiler de equipos"] },
      { name: "Música y cine", subcategories: ["Instrumentos", "Películas", "Accesorios"] },
      { name: "Coleccionables", subcategories: ["Figuras", "Cartas", "Comics"] },
    ],
  },
  ferreteria: {
    label: "Ferretería",
    categories: [
      { name: "Herramientas", subcategories: ["Manuales", "Eléctricas", "Medición"] },
      { name: "Construcción", subcategories: ["Cemento y agregados", "Tornillería", "Pinturas"] },
      { name: "Plomería", subcategories: ["Tuberías", "Grifería", "Conexiones"] },
      { name: "Electricidad", subcategories: ["Cables", "Iluminación", "Interruptores y tomas"] },
      { name: "Jardinería", subcategories: ["Herramientas de jardín", "Riego"] },
    ],
  },
  hogar: {
    label: "Hogar y Decoración",
    categories: [
      { name: "Muebles", subcategories: ["Sala", "Comedor", "Dormitorio", "Oficina"] },
      { name: "Decoración", subcategories: ["Cuadros", "Plantas", "Iluminación", "Textiles"] },
      { name: "Cocina", subcategories: ["Utensilios", "Vajilla", "Electrodomésticos"] },
      { name: "Baño", subcategories: ["Accesorios", "Toallas"] },
      { name: "Limpieza", subcategories: ["Productos", "Organización"] },
    ],
  },
  mascotas: {
    label: "Mascotas y Agropecuaria",
    categories: [
      { name: "Alimentos", subcategories: ["Perros", "Gatos", "Aves", "Peces"] },
      { name: "Accesorios para mascotas", subcategories: ["Camas", "Collares y correas", "Juguetes"] },
      { name: "Salud animal", subcategories: ["Medicamentos", "Antipulgas", "Vitaminas"] },
      { name: "Agropecuaria", subcategories: ["Semillas", "Fertilizantes", "Alimento para ganado", "Herramientas"] },
    ],
  },
  moda: {
    label: "Moda y Boutique",
    categories: [
      { name: "Ropa de mujer", subcategories: ["Vestidos", "Blusas", "Pantalones", "Faldas"] },
      { name: "Ropa de hombre", subcategories: ["Camisas", "Pantalones", "Franelas"] },
      { name: "Niños", subcategories: ["Niñas", "Niños", "Bebés"] },
      { name: "Calzado", subcategories: ["Dama", "Caballero", "Deportivo"] },
      { name: "Accesorios", subcategories: ["Carteras", "Bisutería", "Lentes", "Relojes"] },
    ],
  },
  panaderia: {
    label: "Panadería y Pastelería",
    categories: [
      { name: "Panes", subcategories: ["Pan salado", "Pan dulce", "Integral"] },
      { name: "Tortas", subcategories: ["Por porción", "Enteras", "Personalizadas"] },
      { name: "Dulces y postres", subcategories: ["Galletas", "Postres fríos", "Dulces criollos"] },
      { name: "Salados", subcategories: ["Pastelitos", "Cachitos", "Tequeños"] },
      { name: "Bebidas", subcategories: ["Café", "Jugos", "Refrescos"] },
    ],
  },
  papeleria: {
    label: "Papelería y Librería",
    categories: [
      { name: "Útiles escolares", subcategories: ["Cuadernos", "Lápices y bolígrafos", "Morrales"] },
      { name: "Oficina", subcategories: ["Papel", "Archivo", "Tintas y tóner"] },
      { name: "Libros", subcategories: ["Infantiles", "Literatura", "Textos escolares"] },
      { name: "Arte y manualidades", subcategories: ["Pinturas", "Papeles especiales", "Pegamentos"] },
      { name: "Servicios", subcategories: ["Impresiones", "Copias", "Encuadernación"] },
    ],
  },
  salud: {
    label: "Salud",
    categories: [
      { name: "Medicamentos", subcategories: ["Con récipe", "Sin récipe", "Genéricos"] },
      { name: "Cuidado personal", subcategories: ["Higiene", "Cuidado de la piel", "Cuidado del cabello"] },
      { name: "Vitaminas y suplementos", subcategories: ["Vitaminas", "Proteínas", "Naturales"] },
      { name: "Bebés", subcategories: ["Pañales", "Fórmulas", "Higiene"] },
      { name: "Equipos médicos", subcategories: ["Tensiómetros", "Glucómetros", "Primeros auxilios"] },
    ],
  },
  supermercados: {
    label: "Supermercados",
    categories: [
      { name: "Víveres", subcategories: ["Granos", "Harinas", "Pastas", "Enlatados"] },
      { name: "Charcutería y lácteos", subcategories: ["Quesos", "Embutidos", "Leche y yogur"] },
      { name: "Carnes y pescados", subcategories: ["Res", "Pollo", "Cerdo", "Pescados"] },
      { name: "Frutas y verduras", subcategories: ["Frutas", "Verduras", "Hortalizas"] },
      { name: "Bebidas", subcategories: ["Agua", "Refrescos", "Jugos", "Licores"] },
      { name: "Limpieza e higiene", subcategories: ["Hogar", "Higiene personal"] },
    ],
  },
  tecnologia: {
    label: "Tecnología",
    categories: [
      { name: "Computadoras", subcategories: ["Laptops", "Escritorio", "Componentes"] },
      { name: "Audio y video", subcategories: ["Audífonos", "Cornetas", "Televisores"] },
      { name: "Accesorios", subcategories: ["Cables y cargadores", "Mouse y teclados", "Almacenamiento"] },
      { name: "Gaming", subcategories: ["Consolas", "Videojuegos", "Periféricos"] },
      { name: "Servicio técnico", subcategories: ["Reparación", "Instalación"] },
    ],
  },
  telefonia: {
    label: "Telefonía",
    categories: [
      { name: "Teléfonos", subcategories: ["Android", "iPhone", "Básicos"] },
      { name: "Accesorios", subcategories: ["Forros", "Protectores de pantalla", "Cargadores", "Audífonos"] },
      { name: "Repuestos", subcategories: ["Pantallas", "Baterías", "Piezas"] },
      { name: "Servicios", subcategories: ["Reparación", "Recargas", "Liberación"] },
    ],
  },
} satisfies Record<string, { label: string; categories: { name: string; subcategories: string[] }[] }>;

export type RubroKey = keyof typeof RUBROS;
export const RUBRO_KEYS = Object.keys(RUBROS) as RubroKey[];
export const isRubro = (v: unknown): v is RubroKey => typeof v === "string" && v in RUBROS;

/**
 * Planes de suscripción de Linki App. Precios y comisiones deben coincidir con plan_price()
 * y review_subscription_payment() en la migración 20261030120000_planes_suscripcion.sql.
 */
export const TRIAL_DAYS = 15;
export const PLANS: Record<
  PlanKey,
  { label: string; monthly: number; annual: number; products: string; commission: string; recommended?: boolean; intro?: string; features: string[] }
> = {
  emprendedor: {
    label: "Emprendedor",
    monthly: 3,
    annual: 30,
    products: "Hasta 30 productos",
    commission: "1,5 % sobre ventas",
    features: [
      "Activación y configuración inicial de la tienda",
      "Panel de autogestión para productos y precios",
      "Recepción organizada de pedidos",
      "Vinculación directa con Instagram y WhatsApp",
      "Capacitación rápida de uso y soporte técnico",
    ],
  },
  pro: {
    label: "Pro",
    monthly: 7,
    annual: 70,
    products: "Hasta 100 productos",
    commission: "1 % sobre ventas",
    recommended: true,
    intro: "Todo lo del Plan Emprendedor, más:",
    features: [
      "Link personalizado con el nombre de tu tienda (ej. linkiapp.com/tutienda)",
      "Reportes y estadísticas básicas de visitas y ventas",
      "Soporte técnico prioritario",
    ],
  },
  business: {
    label: "Business",
    monthly: 15,
    annual: 150,
    products: "Productos ilimitados",
    commission: "0,5 % sobre ventas",
    intro: "Todo lo del Plan Pro, más:",
    features: [
      "Catálogo e inventario ilimitado",
      "Accesos para varios administradores del equipo",
      "Asesoría personalizada para optimizar tu tienda",
      "La comisión por venta más baja de la plataforma",
    ],
  },
};
export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];
export const isPlan = (v: unknown): v is PlanKey => typeof v === "string" && v in PLANS;
export const isPlanCycle = (v: unknown): v is PlanCycle => v === "mensual" || v === "anual";
export const planPrice = (plan: PlanKey, cycle: PlanCycle) => (cycle === "anual" ? PLANS[plan].annual : PLANS[plan].monthly);

/** Métodos con los que las tiendas pagan su plan a Linki App (los datos se editan en Superadmin → Planes y cobros). */
export const PLAN_PAYMENT_METHOD_KEYS: PlanPaymentMethodKey[] = ["pago_movil", "paypal", "binance"];

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
  { name: "Linki App", primary: "#009688", secondary: "#004d40", accent: "#9ccc65" },
  { name: "Violeta", primary: "#7c3aed", secondary: "#1e1b4b", accent: "#f59e0b" },
  { name: "Océano", primary: "#0284c7", secondary: "#0c4a6e", accent: "#22d3ee" },
  { name: "Bosque", primary: "#16a34a", secondary: "#14532d", accent: "#facc15" },
  { name: "Coral", primary: "#f43f5e", secondary: "#4c0519", accent: "#fb923c" },
  { name: "Carbón", primary: "#111827", secondary: "#374151", accent: "#eab308" },
  { name: "Café", primary: "#92400e", secondary: "#451a03", accent: "#d97706" },
];

export const DEFAULT_LANDING: LandingContent = {
  brand_name: "Linki App",
  hero_title: "Crea tu tienda online en minutos",
  hero_subtitle: "Tu propia app (PWA) con catálogo, pedidos, pagos y chat con tus clientes. Sin programar.",
  hero_image: "",
  description_title: "¿Qué es Linki App?",
  description:
    "Linki App es un marketplace de tiendas: cada empresa obtiene su propia tienda instalable en el teléfono, con su marca, sus colores y su link (linkiapp.com/tuempresa). Administra productos, stock, pagos (Zelle, PayPal, Pago móvil, Binance, transferencias) y pedidos desde un solo panel.",
  cta_text: "Crear mi tienda",
  features: [
    { title: "Tu marca, tu app", text: "Logo, colores, tipografía y slider propios. Tus clientes la instalan como app." },
    { title: "Pagos locales", text: "Zelle, PayPal, Pago móvil, Binance y transferencias. Aprueba cada pago con un toque." },
    { title: "Pedidos y chat", text: "Controla pedidos por categoría y conversa con tus clientes en tiempo real." },
  ],
  footer_text: "© Linki App — Marketplace de tiendas",
};
