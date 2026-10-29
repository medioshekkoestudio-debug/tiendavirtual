"use server";

import { revalidatePath } from "next/cache";
import { getOwnerStore } from "./auth";
import { FONT_OPTIONS } from "./font-options";
import { PAYMENT_METHOD_KEYS, isRubro } from "./constants";
import { cleanMethodConfig } from "./payment-details";
import type { OrderStatus, PaymentMethodConfig, PaymentMethodKey } from "./types";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const cleanUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//.test(u) ? u.slice(0, 1000) : null);

function done(): ActionResult {
  revalidatePath("/panel", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ Branding
export async function saveBranding(input: {
  name: string;
  description: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_key: string;
  slider_images: (string | null)[];
}): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { error: "Escribe el nombre de tu empresa" };
  for (const c of [input.primary_color, input.secondary_color, input.accent_color]) {
    if (!HEX.test(c)) return { error: "Color inválido" };
  }
  const font = FONT_OPTIONS.some((f) => f.key === input.font_key) ? input.font_key : "inter";
  const { error } = await supabase
    .from("stores")
    .update({
      name,
      description: input.description.trim().slice(0, 2000),
      logo_url: cleanUrl(input.logo_url),
      primary_color: input.primary_color,
      secondary_color: input.secondary_color,
      accent_color: input.accent_color,
      font_key: font,
      slider_images: input.slider_images.map(cleanUrl).filter((u): u is string => !!u).slice(0, 3),
      onboarding_step: Math.max(store.onboarding_step, 1),
    })
    .eq("id", store.id);
  if (error) return { error: error.message };
  revalidatePath(`/${store.slug}`, "layout");
  return done();
}

export async function saveSlug(raw: string): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore();
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
    return { error: "Usa de 3 a 40 letras minúsculas, números o guiones (sin espacios ni acentos)" };
  }
  const { error } = await supabase.from("stores").update({ slug }).eq("id", store.id);
  if (error) return { error: error.code === "23505" ? "Ese link ya está en uso" : "Ese link no está disponible" };
  return done();
}

export async function saveIndustry(industry: string): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore();
  if (!isRubro(industry)) return { error: "Elige un rubro de la lista" };
  const { error } = await supabase.from("stores").update({ industry }).eq("id", store.id);
  if (error) return { error: "No se pudo guardar el rubro" };
  return done();
}

// ------------------------------------------------------------ Métodos de pago
export async function savePaymentMethods(
  input: Partial<Record<PaymentMethodKey, PaymentMethodConfig>>,
): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const clean: Partial<Record<PaymentMethodKey, PaymentMethodConfig>> = {};
  for (const key of PAYMENT_METHOD_KEYS) {
    const src = input[key];
    if (!src) continue;
    clean[key] = cleanMethodConfig(src);
  }
  const { error } = await supabase
    .from("stores")
    .update({ payment_methods: clean, onboarding_step: Math.max(store.onboarding_step, 3) })
    .eq("id", store.id);
  if (error) return { error: error.message };
  return done();
}

export async function completeOnboarding(): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const { error } = await supabase.from("stores").update({ onboarding_completed: true, onboarding_step: 4 }).eq("id", store.id);
  if (error) return { error: error.message };
  return done();
}

// ---------------------------------------------------------------- Categorías
export async function addCategoryTree(tree: { name: string; subcategories: string[] }[]): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const { data: existing } = await supabase.from("categories").select("id,name,parent_id").eq("store_id", store.id);
  const all = existing ?? [];

  for (const [i, node] of tree.entries()) {
    const name = node.name.trim().slice(0, 60);
    if (!name) continue;
    let parent = all.find((c) => !c.parent_id && c.name.toLowerCase() === name.toLowerCase());
    if (!parent) {
      const { data, error } = await supabase
        .from("categories")
        .insert({ store_id: store.id, name, position: i })
        .select("id,name,parent_id")
        .single();
      if (error) return { error: error.message };
      parent = data;
      all.push(data);
    }
    const subs = node.subcategories
      .map((s) => s.trim().slice(0, 60))
      .filter((s) => s && !all.some((c) => c.parent_id === parent!.id && c.name.toLowerCase() === s.toLowerCase()));
    if (subs.length) {
      const { error } = await supabase
        .from("categories")
        .insert(subs.map((s, j) => ({ store_id: store.id, parent_id: parent!.id, name: s, position: j })));
      if (error) return { error: error.message };
    }
  }
  await supabase.from("stores").update({ onboarding_step: Math.max(store.onboarding_step, 2) }).eq("id", store.id);
  return done();
}

export async function createCategory(name: string, parentId: string | null): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Escribe un nombre" };
  const { data, error } = await supabase
    .from("categories")
    .insert({ store_id: store.id, name: clean, parent_id: parentId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { ...done(), id: data.id };
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Escribe un nombre" };
  const { error } = await supabase.from("categories").update({ name: clean }).eq("id", id).eq("store_id", store.id);
  if (error) return { error: error.message };
  return done();
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("store_id", store.id);
  if (error) return { error: error.message };
  return done();
}

// ----------------------------------------------------------------- Productos
export type ProductInput = {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  is_active: boolean;
};

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore(true);
  const name = input.name.trim().slice(0, 120);
  const price = Number(input.price);
  const stock = Math.trunc(Number(input.stock));
  if (!name) return { error: "El producto necesita un nombre" };
  if (!Number.isFinite(price) || price < 0) return { error: "Precio inválido" };
  if (!Number.isFinite(stock) || stock < 0) return { error: "Stock inválido" };

  const row = {
    store_id: store.id,
    name,
    description: input.description.trim().slice(0, 3000),
    price: Math.round(price * 100) / 100,
    stock,
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    image_url: cleanUrl(input.image_url),
    is_active: input.is_active,
  };
  const query = input.id
    ? supabase.from("products").update(row).eq("id", input.id).eq("store_id", store.id).select("id").single()
    : supabase.from("products").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) return { error: error.message };
  revalidatePath(`/${store.slug}`, "layout");
  return { ...done(), id: data.id };
}

export async function setProductStock(id: string, stock: number): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore();
  const value = Math.max(0, Math.trunc(Number(stock) || 0));
  const { error } = await supabase.from("products").update({ stock: value }).eq("id", id).eq("store_id", store.id);
  if (error) return { error: error.message };
  return done();
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore();
  const { error } = await supabase.from("products").delete().eq("id", id).eq("store_id", store.id);
  if (error) return { error: error.message };
  revalidatePath(`/${store.slug}`, "layout");
  return done();
}

// ------------------------------------------------------- Pagos y pedidos
export async function reviewPayment(paymentId: string, approve: boolean): Promise<ActionResult> {
  const { supabase } = await getOwnerStore();
  const { error } = await supabase.rpc("review_payment", { p_payment: paymentId, p_approve: approve });
  if (error) return { error: error.message };
  return done();
}

const ORDER_STATUSES: OrderStatus[] = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ActionResult> {
  const { supabase, store } = await getOwnerStore();
  if (!ORDER_STATUSES.includes(status)) return { error: "Estado inválido" };
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId).eq("store_id", store.id);
  if (error) return { error: error.message };
  return done();
}
