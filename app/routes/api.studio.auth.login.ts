import type { Route } from "./+types/api.studio.auth.login";
import { appendOdooSessionCookies, fetchOdooResponse } from "../lib/odoo-api.server";
export async function action({request,context}:Route.ActionArgs){
 if(!request.headers.get("content-type")?.includes("application/json")) return Response.json({ok:false,error:"Expected application/json."},{status:415});
 const body=await request.json();
 const upstream=await fetchOdooResponse(request,context,"/api/dtf/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const headers=new Headers({"Content-Type":"application/json"}); appendOdooSessionCookies(headers,upstream);
 return new Response(await upstream.text(),{status:upstream.status,headers});
}
