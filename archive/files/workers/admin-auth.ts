import type { ItemStore } from "./item-store";
export type AdminRole = "main_admin" | "printing_technician";
type AdminEnv = { ADMIN_WEB_KEY?: string; ADMIN_BOOTSTRAP_TOKEN_SHA256?: string; ITEMS?: DurableObjectNamespace<ItemStore> };

// Temporary server-only owner configuration. Replace only with the owner's SHA-256 verifier.
const ADMIN_BOOTSTRAP_TOKEN_SHA256 = "88f2aa7492511b4ea69291aea44ef7f69cea6a09c44aa97d102bdde42427262c";

function base64Url(input: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(input))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function resolveAdminWebKey(env: AdminEnv): Promise<string> { if (typeof env.ADMIN_WEB_KEY === "string" && env.ADMIN_WEB_KEY.length > 0) return env.ADMIN_WEB_KEY; if (!env.ITEMS) throw new Error("Admin session key storage is unavailable"); const store=env.ITEMS.get(env.ITEMS.idFromName("default")); const key=await store.getOrCreateAdminSessionKey(); if(typeof key!=="string"||key.length<43) throw new Error("Admin session key storage returned an invalid key"); return key; }

async function signature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export function adminConfigured(env: AdminEnv): boolean { return Boolean(env.ADMIN_WEB_KEY); }

export function getConfiguredBootstrapVerifier(env: AdminEnv): string | null {
  const candidate = (env.ADMIN_BOOTSTRAP_TOKEN_SHA256 ?? ADMIN_BOOTSTRAP_TOKEN_SHA256).trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(candidate) ? candidate : null;
}

export async function bootstrapTokenMatches(token: string, env: AdminEnv): Promise<boolean> {
  const expected = getConfiguredBootstrapVerifier(env);
  if (!expected) return false;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  let difference = 0;
  for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ Number.parseInt(expected.slice(i * 2, i * 2 + 2), 16);
  return difference === 0;
}

export async function createAdminSession(env: AdminEnv, identity: { id: string; role: AdminRole; username?: string }): Promise<string> {
  const secret=await resolveAdminWebKey(env);
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000, userId: identity.id, role: identity.role })));
  return `${payload}.${await signature(secret, payload)}`;
}

export async function getAdminSessionClaims(request: Request, env: AdminEnv): Promise<{ userId: string; role: AdminRole } | null> {
  const secret=await resolveAdminWebKey(env).catch(()=>null); if (!secret) return null; const cookie=request.headers.get("cookie")??""; const match=cookie.match(/(?:^|; )dtf_admin_session=([^;]+)/); if(!match?.[1])return null; const [payload,provided]=match[1].split("."); if(!payload||!provided)return null; const verified=await signature(secret,payload); if(provided!==verified)return null;
  try { const decoded=atob((() => { const normalized=payload.replaceAll("-","+").replaceAll("_","/"); return normalized + "=".repeat((4 - normalized.length % 4) % 4); })()); const data=JSON.parse(decoded) as {exp?:unknown;userId?:unknown;role?:unknown}; if(!Number.isFinite(Number(data.exp))||Number(data.exp)<=Date.now()||typeof data.userId!=="string"||!data.userId)return null; if(data.role==="main_admin")return {userId:data.userId,role:"main_admin"}; if(data.role==="printing_technician")return {userId:data.userId,role:"printing_technician"}; return null; } catch{return null}
}
export async function getAdminRole(request: Request, env: AdminEnv): Promise<AdminRole | null> { return (await getAdminSessionClaims(request,env))?.role??null; }

export async function verifyAdminSession(request: Request, env: AdminEnv): Promise<boolean> {
  return (await getAdminRole(request, env)) !== null;
}
