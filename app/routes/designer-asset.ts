import { redirect } from "react-router";
import type { Route } from "./+types/designer-asset";
import type { ItemStore } from "../../workers/item-store";

function cookieValue(request:Request,name:string){
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function store(context:Route.LoaderArgs["context"]){
  const ns=context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return ns.get(ns.idFromName("default"));
}
export async function loader({request,context,params}:Route.LoaderArgs){
  const sessionId=cookieValue(request,"dtf_session");
  const s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo="+encodeURIComponent(new URL(request.url).pathname));
  let asset:any;
  try{asset=await s.designerAssetAccess(sessionId,String(params.assetId??""));}catch{return new Response("Forbidden",{status:403});}
  if(!asset)return new Response("Asset not found",{status:404});
  const bucket=(context.cloudflare.env as any).DESIGN_ASSETS as R2Bucket|undefined;
  if(!bucket)return new Response("Design asset storage is not configured",{status:503});
  const object=await bucket.get(String(asset.storageKey));
  if(!object)return new Response("Stored asset not found",{status:404});
  const headers=new Headers();
  headers.set("content-type",String(asset.mimeType||object.httpMetadata?.contentType||"application/octet-stream"));
  headers.set("content-length",String(asset.byteSize||object.size));
  headers.set("content-disposition",'inline; filename="'+String(asset.filename||"asset").replace(/["\r\n]/g,"_")+'"');
  headers.set("cache-control","private, max-age=300");
  headers.set("x-content-type-options","nosniff");
  return new Response(object.body,{headers});
}
