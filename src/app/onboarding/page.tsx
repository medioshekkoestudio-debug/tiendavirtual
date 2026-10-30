import { redirect } from "next/navigation";
import { AccessGate } from "@/components/access-gate";
import { PendingPlanNotice } from "@/components/notifications";
import { hasAccess, hasPendingPlanPayment } from "@/lib/access";
import { getOwnerStore } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Configura tu tienda" };

export default async function OnboardingPage() {
  const { supabase, user, store } = await getOwnerStore(true);
  if (store.onboarding_completed) redirect("/panel");
  const { data: categories } = await supabase.from("categories").select("*").eq("store_id", store.id).order("position");
  const access = hasAccess(store);
  const pending = !access && (await hasPendingPlanPayment(supabase, store.id));
  return (
    <>
      {pending && <PendingPlanNotice />}
      <OnboardingWizard store={store} userId={user.id} categories={(categories ?? []) as Category[]} />
      <AccessGate blocked={!access && !pending} hadCoupon={!!store.coupon_code} />
    </>
  );
}
