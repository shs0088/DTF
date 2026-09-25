import { redirect } from "react-router";
import type { Route } from "./+types/designer-asset";
import {
  appendOdooSessionCookies,
  fetchOdooResponse,
} from "../lib/odoo-api.server";

export async function loader({request,context,params}:Route.LoaderArgs){
  const assetId=Number(params.assetId??0);
  if(!Number.isInteger(assetId)||assetId<=0)return new Response("Asset not found",{status:404});
  const upstream=await fetchOdooResponse(
    request,
    context,
    `/api/dtf/v1/designer/assets/${assetId}`,
  );
  const sessionHeaders=new Headers();
  appendOdooSessionCookies(sessionHeaders,upstream);
  if([301,302,303,401,403].includes(upstream.status)){
    throw redirect("/login?returnTo="+encodeURIComponent(new URL(request.url).pathname),{headers:sessionHeaders});
  }
  const headers=new Headers();
  for(const name of [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
    "x-content-type-options",
    "content-security-policy",
  ]){
    const value=upstream.headers.get(name);
    if(value)headers.set(name,value);
  }
  for(const value of (sessionHeaders as Headers & {getSetCookie?:()=>string[]}).getSetCookie?.()??[]){
    headers.append("Set-Cookie",value);
  }
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
}
