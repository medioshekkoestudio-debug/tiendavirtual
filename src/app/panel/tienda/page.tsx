import { getOwnerStore } from "@/lib/auth";
import type { Category, Product } from "@/lib/types";
import { StoreManager } from "./store-manager";

export const metadata = { title: "Tienda" };

export default async function PanelStorePage({ searchParams }: { searchParams: Promise<{ nuevo?: string; editar?: string }> }) {
  const { supabase, user, store } = await getOwnerStore();
  const sp = await searchParams;
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name"),
  ]);
  return (
    <StoreManager
      store={store}
      userId={user.id}
      products={(products ?? []) as Product[]}
      categories={(categories ?? []) as Category[]}
      openNew={sp.nuevo === "1"}
      editId={sp.editar}
    />
  );
}
