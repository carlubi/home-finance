export function getSafeNextPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/"
) {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(raw, "https://home-finance.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
