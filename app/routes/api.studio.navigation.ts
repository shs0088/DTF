import type { Route } from "./+types/api.studio.navigation";
import type { ItemStore } from "../../workers/item-store";

export async function loader({ context }: Route.LoaderArgs) {
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  return Response.json({ ok: true, source: "dtf-studio-database", navigation: await store.navigationItems() });
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "PUT") return new Response("Method not allowed", { status: 405 });
  const payload = await request.json() as { navigation?: unknown };
  if (!Array.isArray(payload.navigation)) return Response.json({ ok: false, error: "navigation must be an array" }, { status: 400 });
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  const navigation = await store.saveNavigationItems(payload.navigation as Parameters<ItemStore["saveNavigationItems"]>[0]);
  return Response.json({ ok: true, source: "dtf-studio-database", navigation });
}
