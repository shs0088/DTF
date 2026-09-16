import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/designer";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, CheckCircle2, FileImage, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

function cookieValue(request:Request,name:string){
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function store(context:Route.LoaderArgs["context"]|Route.ActionArgs["context"]){
  const ns=context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return ns.get(ns.idFromName("default"));
}
function bucket(context:Route.ActionArgs["context"]){return (context.cloudflare.env as any).DESIGN_ASSETS as R2Bucket|undefined;}

export async function loader({request,context}:Route.LoaderArgs){
  const sessionId=cookieValue(request,"dtf_session");
  const s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo=%2Fdesigner");
  try{return await s.designerWorkspace(sessionId) as any;}
  catch{throw redirect("/designer-qualification");}
}

export async function action({request,context}:Route.ActionArgs){
  const sessionId=cookieValue(request,"dtf_session"),s=store(context),form=await request.formData();
  const intent=String(form.get("intent")??"");
  try{
    if(intent==="delete-asset"){
      const result:any=await s.deleteDesignerAsset(sessionId,String(form.get("assetId")??""));
      try{await bucket(context)?.delete(String(result.storageKey));}catch{}
      return {ok:true,message:"Asset deleted."};
    }
    if(intent==="delete-design"){
      const result:any=await s.deleteDesignerDesign(sessionId,String(form.get("designId")??""));
      for(const key of result.storageKeys??[])try{await bucket(context)?.delete(String(key));}catch{}
      return {ok:true,message:"Design deleted."};
    }
    if(intent==="set-cover"||intent==="set-master"){
      const designId=String(form.get("designId")??""),assetId=String(form.get("assetId")??"");
      await s.setDesignerAssetRoles(sessionId,designId,assetId,intent==="set-cover"?{cover:true}:{master:true});
      return {ok:true,message:intent==="set-cover"?"Main Display Image updated.":"Ready-to-Print Master updated."};
    }
    return {ok:false,error:"Unsupported Designer action."};
  }catch(error){return {ok:false,error:error instanceof Error?error.message:"Designer action failed."};}
}

function statusClass(value:string){return String(value).toLowerCase()==="passed"?"designer-status passed":String(value).toLowerCase()==="failed"?"designer-status failed":"designer-status pending";}

export default function DesignerDashboard(){
  const data=useLoaderData<typeof loader>() as any;
  const result=useActionData<typeof action>() as any;
  const designs=data.designs??[];
  return <main className="studio-shell designer-shell" dir="ltr">
    <header className="site-header container">
      <Link className="back-link" to="/"><ArrowLeft size={17}/></Link>
      <span className="page-title">Designer Dashboard</span>
      <Link className="button button-primary" to="/designer/new-design"><Plus size={16}/> New Design</Link>
    </header>
    <section className="container designer-page">
      <div className="designer-hero">
        <div><span className="eyebrow">AUTHORIZED DESIGNER</span><h1>Your design studio.</h1><p>One large cover per design. Open a design to review every uploaded asset, preflight result, Main Display Image, and Ready-to-Print Master.</p></div>
        <div className="designer-hero-stat"><ShieldCheck size={22}/><b>{designs.length}</b><span>Designs</span></div>
      </div>
      {result?.error&&<div className="auth-error">{result.error}</div>}
      {result?.message&&<div className="designer-success"><CheckCircle2 size={16}/>{result.message}</div>}
      {designs.length===0?<div className="designer-empty"><UploadCloud size={34}/><h2>No designs yet.</h2><p>Create your first bilingual design and upload the real production assets.</p><Link className="button button-primary" to="/designer/new-design">Create New Design</Link></div>:
      <div className="designer-design-grid">{designs.map((d:any)=>{
        const cover=d.assets?.find((a:any)=>a.isCover)??d.assets?.find((a:any)=>a.previewable);
        return <article className="designer-design-card" key={d.designId}>
          <div className="designer-cover">{cover?.mimeType?.startsWith("image/")?<img src={"/designer/assets/"+encodeURIComponent(cover.assetId)} alt={d.titleEn}/>:<FileImage size={52}/>}<span className="designer-card-status">{d.status}</span></div>
          <div className="designer-card-body"><h2>{d.titleEn}</h2><p>{d.titleAr}</p><div className="designer-card-meta"><span>{d.productType}</span><span>{d.assets?.length??0} assets</span></div></div>
          <details className="designer-detail"><summary>Open design assets</summary><div className="designer-assets">
            {(d.assets??[]).map((a:any)=><div className="designer-asset-row" key={a.assetId}>
              <div className="designer-asset-thumb">{a.mimeType?.startsWith("image/")?<img src={"/designer/assets/"+encodeURIComponent(a.assetId)} alt={a.filename}/>:<FileImage size={28}/>}</div>
              <div className="designer-asset-copy"><b>{a.filename}</b><small>{a.pixelWidth||"—"}×{a.pixelHeight||"—"} · DPI {a.effectiveDpi||a.embeddedDpi||"n/a"}</small><div className="designer-badges">{a.isCover&&<span>Main Display</span>}{a.isMaster&&<span className="master">Print Master</span>}<span className={statusClass(a.preflightStatus)}>{a.preflightStatus||"pending"}</span></div></div>
              <div className="designer-asset-actions">
                {!a.isCover&&<Form method="post"><input type="hidden" name="intent" value="set-cover"/><input type="hidden" name="designId" value={d.designId}/><input type="hidden" name="assetId" value={a.assetId}/><button title="Set Main Display Image">Cover</button></Form>}
                {!a.isMaster&&a.preflightStatus==="passed"&&<Form method="post"><input type="hidden" name="intent" value="set-master"/><input type="hidden" name="designId" value={d.designId}/><input type="hidden" name="assetId" value={a.assetId}/><button title="Set Ready-to-Print Master">Master</button></Form>}
                <Form method="post"><input type="hidden" name="intent" value="delete-asset"/><input type="hidden" name="assetId" value={a.assetId}/><button className="danger-small" disabled={Boolean(a.protected)} title={a.protected?"Protected by order/production":"Delete asset"}><Trash2 size={14}/></button></Form>
              </div>
            </div>)}
          </div><Form method="post" className="designer-delete-design"><input type="hidden" name="intent" value="delete-design"/><input type="hidden" name="designId" value={d.designId}/><button><Trash2 size={14}/> Delete Design</button></Form></details>
        </article>;
      })}</div>}
    </section>
  </main>;
}
