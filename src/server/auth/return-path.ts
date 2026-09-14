export function safeReturnPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/",
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  )
    return fallback;
  try {
    const url = new URL(trimmed, "https://lumaforge.local");
    if (url.origin !== "https://lumaforge.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
