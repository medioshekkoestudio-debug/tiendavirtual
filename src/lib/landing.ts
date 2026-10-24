import { DEFAULT_LANDING } from "./constants";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { LandingContent } from "./types";

export async function getLandingContent(): Promise<LandingContent> {
  if (!isSupabaseConfigured()) return DEFAULT_LANDING;
  const supabase = await createClient();
  const { data } = await supabase.from("landing_content").select("content").eq("id", 1).maybeSingle();
  return { ...DEFAULT_LANDING, ...((data?.content as Partial<LandingContent>) ?? {}) };
}
