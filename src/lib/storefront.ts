import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Store } from "./types";

export const getStoreBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").eq("slug", slug.toLowerCase()).maybeSingle<Store>();
  return data;
});
