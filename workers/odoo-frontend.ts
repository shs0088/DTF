import { createRequestHandler } from "react-router";
interface Env {
  ASSETS?: {
    fetch(request: Request): Promise<Response> | Response;
  };
  DTF_ODOO_ORIGIN: string;
}

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

function shouldServeAsset(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const pathname = new URL(request.url).pathname;
  return (
    pathname.startsWith("/assets/") ||
    pathname.includes(".") ||
    pathname === "/robots.txt"
  );
}

function requireOdooOrigin(env: Env): string {
  const raw = String(env.DTF_ODOO_ORIGIN || "").trim();
  if (!raw) {
    throw new Error("DTF_ODOO_ORIGIN is required for the Odoo-backed frontend.");
  }
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("DTF_ODOO_ORIGIN must use HTTPS in production.");
  }
  if (url.hostname.includes("dtf-studio-v48-safe-frontend")) {
    throw new Error("The protected V48 deployment cannot be used as the Odoo origin.");
  }
  return url.origin;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    requireOdooOrigin(env);

    if (env.ASSETS && shouldServeAsset(request)) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return handler(request, {
      cloudflare: { env, ctx },
    } as any);
  },
} satisfies ExportedHandler<Env>;
