import type { Route } from "./+types/api.studio.health";
import type { ItemStore } from "../../workers/item-store";

export async function loader({ context }: Route.LoaderArgs) {
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  const health = await store.health();
  return Response.json({ ok: true, service: "dtf-studio", ...health });
}
