import type { Route } from "./+types/api.studio.homepage-banner";
import { fetchOdooResponse } from "../lib/odoo-api.server";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const bannerId = Number(params.bannerId ?? 0);
  if (!Number.isInteger(bannerId) || bannerId <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const upstream = await fetchOdooResponse(
    request,
    context,
    `/api/dtf/v1/homepage/banners/${bannerId}/image`,
  );
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "cache-control", "x-content-type-options"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
