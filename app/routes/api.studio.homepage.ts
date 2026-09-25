import type { Route } from "./+types/api.studio.homepage";
import { fetchOdooJson } from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const payload = await fetchOdooJson(request, context, "/api/dtf/v1/homepage");
    return Response.json({ ok: true, source: "odoo19", ...(payload as object) });
  } catch {
    return Response.json(
      { ok: false, source: "odoo19", error: "homepage_unavailable" },
      { status: 502 },
    );
  }
}
