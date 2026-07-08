import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

/**
 * Cliente con clave secreta (solo servidor): salta la RLS.
 * Usar únicamente para operaciones controladas (invitaciones, notificaciones).
 */
export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseSecretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }

  return createSupabaseClient(
    supabaseUrl,
    supabaseSecretKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
