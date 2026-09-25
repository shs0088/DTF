import type { Route } from "./+types/api.studio.designs";
import {
  fetchOdooJson,
  mapOdooDesigns,
} from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const payload = await fetchOdooJson(request, context, "/api/dtf/v1/designs");
    return Response.json({
      ok: true,
      source: "odoo19",
      designs: mapOdooDesigns(payload as any),
    });
  } catch {
    return Response.json(
      { ok: false, source: "odoo19", error: "design_gallery_unavailable" },
      { status: 502 },
    );
  }
}
