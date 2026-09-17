import type { Route } from "./+types/api.studio.categories";
import type { ItemStore } from "../../workers/item-store";

export async function loader({ context }: Route.LoaderArgs) {
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  return Response.json({ ok: true, source: "dtf-studio-database", categories: await store.categories() });
}
