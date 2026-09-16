import { redirect } from "react-router";
import type { Route } from "./+types/language";
import { localeCookie, safeReturnTo, type AppLocale } from "../i18n";

export async function loader({ request, params }: Route.LoaderArgs) {
  const locale: AppLocale = params.locale === "ar" ? "ar" : "en";
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  return redirect(returnTo, { headers: { "Set-Cookie": localeCookie(locale) } });
}

export default function Language() { return null; }
