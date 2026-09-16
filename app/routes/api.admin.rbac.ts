import type { Route } from "./+types/api.admin.rbac";
import type { ItemStore } from "../../workers/item-store";
import { getAdminSessionClaims } from "../../workers/admin-auth";

function envForAuth(context: Route.LoaderArgs["context"]) {
  return context.cloudflare.env as unknown as { ADMIN_WEB_KEY?: string; ITEMS: DurableObjectNamespace<ItemStore> };
}

async function guard(request: Request, context: Route.LoaderArgs["context"], resource: string, mode: "access"|"modify") {
  const env=envForAuth(context);
  const claims=await getAdminSessionClaims(request,env);
  if(!claims) return { response: Response.json({ok:false,error:"Admin authentication required."},{status:401}) };
  const store=env.ITEMS.get(env.ITEMS.idFromName("default"));
  const identity=await store.adminIdentity(claims.userId);
  if(!identity) return { response: Response.json({ok:false,error:"Admin authentication required."},{status:401}) };
  if(!await store.adminCanUser(identity.id,resource,mode)) return { response: Response.json({ok:false,error:"Permission denied."},{status:403}) };
  return { identity, store };
}

export async function loader({request,context}:Route.LoaderArgs){
  const g=await guard(request,context,"admin.user_groups","access");
  if("response" in g) return g.response;
  const groups=await g.store.adminGroups();
  const permissions=Object.fromEntries((groups as any[]).map((row:any)=>[String(row.id),g.store.adminPermissionMatrix(String(row.id))]));
  return Response.json({
    ok:true,
    users:await g.store.adminUsers(),
    groups,
    resources:g.store.adminResources(),
    permissions
  });
}

export async function action({request,context}:Route.ActionArgs){
  const g=await guard(request,context,"admin.user_groups","modify");
  if("response" in g) return g.response;
  const body=await request.json().catch(()=>({})) as any;
  if(body.operation==="create_group") return Response.json({ok:true,group:g.store.createAdminGroup(g.identity.id,String(body.name||""))});
  if(body.operation==="update_group") return Response.json({ok:true,group:g.store.updateAdminGroup(g.identity.id,String(body.groupId||""),{name:body.name,enabled:body.enabled,access:Array.isArray(body.access)?body.access:undefined,modify:Array.isArray(body.modify)?body.modify:undefined})});
  if(body.operation==="delete_group") return Response.json({ok:true,group:g.store.deleteAdminGroup(g.identity.id,String(body.groupId||""))});
  return Response.json({ok:false,error:"Unsupported RBAC operation."},{status:400});
}
