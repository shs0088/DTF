import type { Route } from "./+types/api.studio.categories";
import {
  fetchOdooJson,
  mapOdooCategories,
} from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const payload = await fetchOdooJson(
      request,
      context,
      "/api/dtf/v1/categories",
    );
    return Response.json({
      ok: true,
      source: "odoo19",
      categories: mapOdooCategories(payload as any),
    });
  } catch {
    return Response.json(
      { ok: false, source: "odoo19", error: "catalog_unavailable" },
      { status: 502 },
    );
  }
}
