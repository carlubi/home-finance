import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AppProfile = {
  full_name: string | null;
  onboarding_completed: boolean | null;
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getAppProfile = cache(
  async (userId: string): Promise<AppProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, onboarding_completed")
      .eq("id", userId)
      .single();

    return data as AppProfile | null;
  }
);
