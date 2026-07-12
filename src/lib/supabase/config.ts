function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return undefined;
}

const DEFAULT_SITE_URL = "https://home-finance-lilac.vercel.app";

export function getSiteUrl() {
  const siteUrl = readEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL") ?? DEFAULT_SITE_URL;
  return siteUrl.replace(/\/+$/, "");
}

export function getSupabaseUrl() {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

export function getSupabasePublishableKey() {
  return readEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY"
  );
}

export function getSupabaseSecretKey() {
  return readEnv("SUPABASE_SECRET_KEY");
}
