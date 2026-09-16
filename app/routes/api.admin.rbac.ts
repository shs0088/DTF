import type { Route } from "./+types/api.admin.rbac";
import type { ItemStore } from "../../workers/item-store";
import { getAdminSessionClaims } from "../../workers/admin-auth";

function envForAuth(context: Route.LoaderArgs["context"]) { return context.cloudflare.env as unknown as { ADMIN_WEB_KEY?: string; ITEMS: DurableObjectNamespace<ItemStore> }; }
async function guard(request: Request, context: Route.LoaderArgs["context"], resource: string, action: string) {
  const env=envForAuth(context); const claims=await getAdminSessionClaims(request, env);
  if(!claims) return { response: Response.json({ok:false,error:"Admin authentication required."},{status:401}) };
  const store=env.ITEMS.get(env.ITEMS.idFromName("default"));
  if(!await store.adminCan(claims.role,resource,action)) return { response: Response.json({ok:false,error:"Permission denied."},{status:403}) };
  return { claims, store };
}
export async function loader({request,context}:Route.LoaderArgs){ const g=await guard(request,context,"admin.user_groups","access"); if("response" in g) return g.response; return Response.json({ok:true,users:await g.store.adminUsers(),groups:await g.store.adminGroups(),permissions:await g.store.adminPermissionMatrix(g.claims.role)}); }
export async function action({request,context}:Route.ActionArgs){ const g=await guard(request,context,"admin.user_groups","manage_permissions"); if("response" in g) return g.response; const body=await request.json().catch(()=>({})) as {role?:string;resource?:string;action?:string}; if(body.role!=="printing_technician"||!body.resource||!body.action) return Response.json({ok:false,error:"Only explicit operator permission changes are supported."},{status:400}); await g.store.adminAudit(g.claims.userId,"permission_change","admin_permission_assignments",`${body.resource}:${body.action}`,"success",body); return Response.json({ok:true,recorded:true}); }
