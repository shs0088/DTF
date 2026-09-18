import { createRequestHandler } from "react-router";
import type { CamelAiBinding } from "./camelai-binding";
import type { ItemStore } from "./item-store";

export { ItemStore } from "./item-store";

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> | Response };
  CAMELAI: CamelAiBinding;
  ITEMS: DurableObjectNamespace<ItemStore>;
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const V48_ASSET_PATH = "/DTF_Studio_V48.22E_VIEW_ALL_SYNCED.html";

function shouldServeAsset(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const pathname = new URL(request.url).pathname;
  return pathname.startsWith("/assets/") || pathname.includes(".") || pathname === "/robots.txt";
}

function isStudioUiRequest(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const pathname = new URL(request.url).pathname;
  return !pathname.startsWith("/api/") && !shouldServeAsset(request);
}

async function serveV48(request: Request, env: Env): Promise<Response | null> {
  if (!env.ASSETS) return null;
  const sourceUrl = new URL(request.url);
  sourceUrl.pathname = V48_ASSET_PATH;
  sourceUrl.search = "";
  sourceUrl.hash = "";
  const assetRequest = new Request(sourceUrl.toString(), request);
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) return null;
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  return new HTMLRewriter()
    .on("body", { element(element) { element.append('<script src="/canonical-data-binding.js"></script>', { html: true }); } })
    .transform(response);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // V48.22E is the authoritative UI. Serve its exact self-contained HTML for
    // every storefront/dashboard GET request. Its own hash router controls all
    // customer, designer, admin, operator and QA pages without altering the file.
    if (isStudioUiRequest(request)) {
      const v48 = await serveV48(request, env);
      if (v48) return v48;
    }

    if (env.ASSETS && shouldServeAsset(request)) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }

    // Keep Camel's API/backend routes available exactly as they are.
    return requestHandler(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
