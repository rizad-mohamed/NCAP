export function safeInternalPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\")) return fallback;

  try {
    const parsed = new URL(value, "https://ncap.invalid");
    if (parsed.origin !== "https://ncap.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
