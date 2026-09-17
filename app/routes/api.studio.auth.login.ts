import type { Route } from "./+types/api.studio.auth.login";
import type { ItemStore } from "../../workers/item-store";

export async function action({ request, context }: Route.ActionArgs) {
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false, error: "Expected application/json." }, { status: 415 });
  const body = await request.json() as { identifier?: string; password?: string };
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  const result = await store.loginUser(String(body.identifier ?? ""), String(body.password ?? ""));
  if (!result) return Response.json({ ok: false, error: "The sign-in details were not recognized." }, { status: 401 });
  return Response.json({ ok: true, userId: result.userId, role: result.role }, { headers: { "Set-Cookie": `dtf_session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } });
}
