"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tables = [
  "family_expenses", "family_recurring_expenses", "family_recurring_expense_skips",
  "family_expense_preferences", "family_expense_categories", "family_unit_members",
  "family_personal_sharing", "monthly_budget_plans", "monthly_budget_items",
  "family_mortgages", "family_mortgage_payments", "financial_goals",
  "expenses", "income", "fixed_expenses", "investments",
];

export function FamilyLiveRefresh({ familyUnitId }: { familyUnitId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase.channel(`family-refresh-${familyUnitId}`);
    for (const table of tables) {
      channel.on("postgres_changes", {
        event: "*", schema: "public", table,
        ...(["monthly_budget_items", "family_unit_members", "expenses", "income", "fixed_expenses", "investments"].includes(table) ? {} : { filter: `family_unit_id=eq.${familyUnitId}` }),
      }, refresh);
    }
    channel.subscribe();
    const onVisibility = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(refresh, 60_000);
    return () => { if (timeout) clearTimeout(timeout); clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); supabase.removeChannel(channel); };
  }, [familyUnitId, router]);
  return null;
}
