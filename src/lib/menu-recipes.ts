export function normalizeRecipeUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    if (url.username || url.password) return null;
    const normalized = url.toString();
    return normalized.length <= 2048 ? normalized : null;
  } catch {
    return null;
  }
}
