import type { Route } from "./+types/api.studio.design-asset";
import { fetchOdooResponse } from "../lib/odoo-api.server";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const assetId = Number(params.assetId ?? 0);
  if (!Number.isInteger(assetId) || assetId <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const upstream = await fetchOdooResponse(
    request,
    context,
    `/api/dtf/v1/design-assets/${assetId}/preview`,
  );
  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
    "x-content-type-options",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
