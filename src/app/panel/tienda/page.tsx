import { getOwnerStore } from "@/lib/auth";
import { getBcvRate } from "@/lib/exchange-rate";
import type { Category, Product } from "@/lib/types";
import { StoreManager } from "./store-manager";
import { productLimit, siteTier } from "@/lib/site";
import { PLANS } from "@/lib/constants";

export const metadata = { title: "Tienda" };

export default async function PanelStorePage({ searchParams }: { searchParams: Promise<{ nuevo?: string; editar?: string }> }) {
  const { supabase, user, store } = await getOwnerStore();
  const sp = await searchParams;
  const [{ data: products }, { data: categories }, rate] = await Promise.all([
    supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("store_id", store.id).order("position").order("name"),
    store.show_bs !== false ? getBcvRate() : null,
  ]);
  return (
    <StoreManager
      store={store}
      userId={user.id}
      bsRate={rate?.rate ?? null}
      products={(products ?? []) as Product[]}
      categories={(categories ?? []) as Category[]}
      openNew={sp.nuevo === "1"}
      editId={sp.editar}
      limit={productLimit(store)}
      planLabel={PLANS[siteTier(store)].label}
    />
  );
}
