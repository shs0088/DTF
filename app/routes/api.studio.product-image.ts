import type { Route } from "./+types/api.studio.product-image";
import { fetchOdooResponse } from "../lib/odoo-api.server";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const productId = Number(params.productId ?? 0);
  if (!Number.isInteger(productId) || productId <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const upstream = await fetchOdooResponse(
    request,
    context,
    `/api/dtf/v1/products/${productId}/image`,
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
