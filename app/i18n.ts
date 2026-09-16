export type AppLocale = "en" | "ar";

export function localeFromRequest(request: Request): AppLocale {
  const url = new URL(request.url);
  const query = url.searchParams.get("lang");
  if (query === "ar" || query === "en") return query;
  const cookie = request.headers.get("cookie") ?? "";
  const part = cookie.split(";").map((x) => x.trim()).find((x) => x.startsWith("dtf_locale="));
  return part?.slice("dtf_locale=".length) === "ar" ? "ar" : "en";
}

export function localeCookie(locale: AppLocale): string {
  return `dtf_locale=${locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function localeDir(locale: AppLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function pick<T>(locale: AppLocale, en: T, ar: T): T {
  return locale === "ar" ? ar : en;
}

export function safeReturnTo(value: string | null | undefined): string {
  const raw = String(value ?? "/");
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export function productTypeLabel(locale: AppLocale, value: string): string {
  if (locale === "en") return value;
  const parts = value.split("+").map((x) => x.trim());
  const map: Record<string,string> = {"T-Shirt":"تيشيرت","Mug":"كوب","Cap":"كاب"};
  return parts.map((x)=>map[x] ?? x).join(" + ");
}
