export function normalizeReturnTo(value: unknown): string {
  const raw = typeof value === "string" ? value : String(value ?? "/");
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";

  try {
    const base = new URL("https://dtf.local");
    const parsed = new URL(raw, base);
    if (parsed.origin !== base.origin) return "/";

    let pathname = parsed.pathname || "/";
    if (pathname.endsWith(".data")) {
      pathname = pathname.slice(0, -5) || "/";
    }

    parsed.searchParams.delete("_routes");
    const search = parsed.searchParams.toString();
    return pathname + (search ? "?" + search : "") + parsed.hash;
  } catch {
    return "/";
  }
}
