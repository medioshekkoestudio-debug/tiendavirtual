import { redirect } from "next/navigation";
import { getOwnerStore } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Configura tu tienda" };

export default async function OnboardingPage() {
  const { supabase, user, store } = await getOwnerStore(true);
  if (store.onboarding_completed) redirect("/panel");
  const { data: categories } = await supabase.from("categories").select("*").eq("store_id", store.id).order("position");
  return <OnboardingWizard store={store} userId={user.id} categories={(categories ?? []) as Category[]} />;
}
