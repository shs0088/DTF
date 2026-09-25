import type { Route } from "./+types/api.studio.auth.session";
import { appendOdooSessionCookies, fetchOdooResponse } from "../lib/odoo-api.server";
export async function loader({request,context}:Route.LoaderArgs){
 const upstream=await fetchOdooResponse(request,context,"/api/dtf/v1/auth/session");
 const headers=new Headers({"Content-Type":"application/json"}); appendOdooSessionCookies(headers,upstream);
 return new Response(await upstream.text(),{status:upstream.status,headers});
}
