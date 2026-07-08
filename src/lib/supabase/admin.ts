import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con clave secreta (solo servidor): salta la RLS.
 * Usar únicamente para operaciones controladas (invitaciones, notificaciones).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
