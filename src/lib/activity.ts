// Nombres legibles de la actividad que registra la base (activity_log) para el Superadmin

export const ACTIVITY_LABELS: Record<string, string> = {
  inicio_sesion: "Inició sesión",
  visita: "Abrió una pantalla",
  producto_creado: "Cargó un producto",
  producto_editado: "Editó un producto",
  producto_eliminado: "Eliminó un producto",
  categoria_creada: "Creó una categoría",
  categoria_eliminada: "Eliminó una categoría",
  ajustes_cambiados: "Cambió ajustes de la tienda",
  configuracion_terminada: "Terminó de configurar su tienda",
  venta_recibida: "Recibió un pedido",
  pedido_estado: "Cambió el estado de un pedido",
  pago_cliente_aprobado: "Aprobó el pago de un cliente",
  pago_cliente_rechazado: "Rechazó el pago de un cliente",
  pago_plan_enviado: "Envió el pago de su plan",
  pago_plan_aprobado: "Pago de plan aprobado",
  pago_plan_rechazado: "Pago de plan rechazado",
  pago_comisiones_enviado: "Envió un pago de comisiones",
  pago_comisiones_aprobado: "Pago de comisiones aprobado",
  pago_comisiones_rechazado: "Pago de comisiones rechazado",
  cupon_canjeado: "Usó un cupón",
};

/** Pantallas del panel con nombre */
export const PANEL_SCREENS: [string, string][] = [
  ["/panel/tienda", "Tienda y productos"],
  ["/panel/pagos", "Pagos"],
  ["/panel/pedidos", "Pedidos"],
  ["/panel/mensajes", "Mensajes"],
  ["/panel/comisiones", "Comisiones y plan"],
  ["/panel/ajustes", "Ajustes"],
  ["/onboarding", "Configuración inicial"],
  ["/suscripcion", "Planes"],
  ["/panel", "Inicio"],
];

export function screenName(path: string) {
  return PANEL_SCREENS.find(([p]) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"))?.[1] ?? path;
}

export type Segment = "suscripcion" | "cupon" | "sin_plan";
export const SEGMENTS: Record<Segment, { label: string; className: string }> = {
  suscripcion: { label: "Suscripción", className: "bg-emerald-100 text-emerald-800" },
  cupon: { label: "Cupón", className: "bg-sky-100 text-sky-800" },
  sin_plan: { label: "Sin plan", className: "bg-slate-100 text-slate-600" },
};

/** Teléfono venezolano a formato de WhatsApp: 0414-1234567 → 584141234567 */
export function whatsAppNumber(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("58")) return d;
  if (d.startsWith("0") && d.length === 11) return `58${d.slice(1)}`;
  if (d.length === 10) return `58${d}`;
  return d;
}
