import type { Route } from "./+types/api.studio.products";
import {
  fetchOdooJson,
  mapOdooProducts,
} from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const payload = await fetchOdooJson<{ items?: Array<{ currency?: string }> }>(
      request,
      context,
      "/api/dtf/v1/products",
    );
    return Response.json({
      ok: true,
      source: "odoo19",
      pricingCurrency: payload.items?.[0]?.currency ?? "JOD",
      products: mapOdooProducts(payload as any),
    });
  } catch {
    return Response.json(
      { ok: false, source: "odoo19", error: "catalog_unavailable" },
      { status: 502 },
    );
  }
}
