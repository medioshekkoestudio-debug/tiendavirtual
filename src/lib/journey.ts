// Seguimiento de usuarios (Superadmin): hasta qué paso llegó cada tienda y cuántos días lleva sin usar la app.
// El plan no es un paso del embudo: quien entra por la pasarela paga antes de configurar; se ve en «Tipo».

export type Journey = {
  store_id: string;
  onboarding_completed: boolean;
  configured_at: string | null;
  first_product_at: string | null;
  orders: number;
  first_order_at: string | null;
  plan_paid_at: string | null;
  last_login_at: string | null;
};

export type StageKey = "registro" | "configuro" | "productos" | "pedido";

/** Pasos en orden; `stuck` describe a quien se quedó en ese paso (le falta el siguiente) */
export const STAGES: { key: StageKey; label: string; stuck: string; className: string }[] = [
  { key: "registro", label: "Se registró", stuck: "No configuró su tienda", className: "bg-rose-100 text-rose-800" },
  { key: "configuro", label: "Configuró su tienda", stuck: "No ha cargado productos", className: "bg-amber-100 text-amber-800" },
  { key: "productos", label: "Cargó productos", stuck: "Sin pedidos todavía", className: "bg-sky-100 text-sky-800" },
  { key: "pedido", label: "Recibió pedidos", stuck: "Vendiendo", className: "bg-emerald-100 text-emerald-800" },
];

/** Último paso alcanzado sin saltos (índice en STAGES) */
export function stageIndex(j: Journey | undefined, products: number): number {
  if (!j?.onboarding_completed) return 0;
  if (products <= 0 && !j.first_product_at) return 1;
  if (!j.orders) return 2;
  return 3;
}

/** Fecha en que se alcanzó cada paso (la del registro la pone quien llama) */
export function stageDates(j: Journey | undefined, createdAt: string): (string | null)[] {
  return [createdAt, j?.configured_at ?? (j?.onboarding_completed ? createdAt : null), j?.first_product_at ?? null, j?.first_order_at ?? null];
}

/** Días completos desde la última señal de uso (actividad o registro) */
export function daysInactive(lastActivity: string | null, createdAt: string) {
  const last = new Date(lastActivity ?? createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - last) / 86_400_000));
}

export const INACTIVE_FILTERS = [7, 14, 30] as const;

export const inactiveTone = (days: number) => (days >= 14 ? "text-rose-600" : days >= 7 ? "text-amber-600" : "text-slate-500");
