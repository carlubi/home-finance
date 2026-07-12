import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AppProfile = {
  full_name: string | null;
  onboarding_completed: boolean | null;
};

export type AppUser = {
  id: string;
  email: string | null;
};

/**
 * Usuario actual a partir del JWT validado localmente (getClaims + JWKS en
 * caché): evita un viaje de red a Supabase en cada renderizado de página.
 * Las mutaciones sensibles siguen validándose con RLS en la base de datos.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
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
