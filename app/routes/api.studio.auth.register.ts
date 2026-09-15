import type { Route } from "./+types/api.studio.auth.register";
import type { ItemStore } from "../../workers/item-store";

export async function action({ request, context }: Route.ActionArgs) {
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ ok: false, error: "Expected application/json." }, { status: 415 });
  try {
    const body = await request.json() as { displayName?: string; email?: string; password?: string; role?: "customer" | "designer" };
    const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
    const store = namespace.get(namespace.idFromName("default"));
    const result = await store.registerUser({ displayName: String(body.displayName ?? ""), email: String(body.email ?? ""), password: String(body.password ?? ""), role: body.role === "designer" ? "designer" : "customer" });
    return Response.json({ ok: true, userId: result.userId, role: result.role }, { status: 201, headers: { "Set-Cookie": `dtf_session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } });
  } catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : "Registration failed." }, { status: 400 }); }
}
