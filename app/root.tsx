import type { ReactNode } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import { localeDir, localeFromRequest, pick, type AppLocale } from "./i18n";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export async function loader({ request }: Route.LoaderArgs) {
  return { locale: localeFromRequest(request) };
}

function LanguageToggle({ locale }: { locale: AppLocale }) {
  const location = useLocation();
  const next: AppLocale = locale === "ar" ? "en" : "ar";
  const returnTo = location.pathname + location.search + location.hash;
  return <a className="global-language-toggle" href={"/language/"+next+"?returnTo="+encodeURIComponent(returnTo)} aria-label={pick(locale,"Switch to Arabic","التبديل إلى الإنجليزية")}>{locale === "ar" ? "EN" : "عربي"}</a>;
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData("root") as { locale?: AppLocale } | undefined;
  const locale: AppLocale = data?.locale === "ar" ? "ar" : "en";
  return (
    <html lang={locale} dir={localeDir(locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  return <><LanguageToggle locale={locale}/><div className="app-locale-root" dir={localeDir(locale)}><Outlet /></div></>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const data = useRouteLoaderData("root") as { locale?: AppLocale } | undefined;
  const locale: AppLocale = data?.locale === "ar" ? "ar" : "en";
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : pick(locale,"Unexpected error","خطأ غير متوقع");
  return (
    <main className="error-page" dir={localeDir(locale)}>
      <span className="eyebrow">DTF STUDIO / {status}</span>
      <h1>{pick(locale,"Something went wrong.","حدث خطأ ما.")}</h1>
      <p>{message}</p>
      <a className="button button-primary" href="/">{pick(locale,"Return home","العودة للرئيسية")}</a>
    </main>
  );
}
