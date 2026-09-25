import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/designer";
import { ArrowLeft, CheckCircle2, FileImage, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { localeDir, localeFromRequest, pick, productTypeLabel, useAppLocale } from "../i18n";
import {
  appendOdooSessionCookies,
  fetchOdooJsonRpc,
  fetchOdooResponse,
} from "../lib/odoo-api.server";

export async function loader({request,context}:Route.LoaderArgs){
  const upstream=await fetchOdooResponse(
    request,
    context,
    "/api/dtf/v1/designer/workspace",
  );
  const headers=new Headers();
  appendOdooSessionCookies(headers,upstream);
  if([301,302,303,401,403].includes(upstream.status)){
    throw redirect("/login?returnTo=%2Fdesigner",{headers});
  }
  if(upstream.status===409){
    throw redirect("/designer-qualification",{headers});
  }
  if(!upstream.ok) throw new Response("Designer workspace unavailable.",{status:502});
  return Response.json(await upstream.json(),{headers});
}

export async function action({request,context}:Route.ActionArgs){
  const form=await request.formData();
  const locale=localeFromRequest(request);
  const intent=String(form.get("intent")??"");
  const designId=Number(form.get("designId")??0);
  const assetId=Number(form.get("assetId")??0);
  try{
    let path="";
    let params:Record<string,unknown>={};
    if(intent==="delete-asset"&&Number.isInteger(assetId)&&assetId>0){
      path=`/api/dtf/v1/designer/assets/${assetId}/delete`;
    }else if(intent==="delete-design"&&Number.isInteger(designId)&&designId>0){
      path=`/api/dtf/v1/designer/designs/${designId}/delete`;
    }else if((intent==="set-cover"||intent==="set-master")&&Number.isInteger(designId)&&designId>0&&Number.isInteger(assetId)&&assetId>0){
      path=`/api/dtf/v1/designer/designs/${designId}/${intent==="set-cover"?"cover":"master"}`;
      params={asset_id:assetId};
    }else{
      return {ok:false,error:pick(locale,"Unsupported Designer action.","إجراء المصمم غير مدعوم.")};
    }
    const {result,response}=await fetchOdooJsonRpc<any>(request,context,path,params);
    const headers=new Headers();
    appendOdooSessionCookies(headers,response);
    if(result?.error){
      return Response.json({ok:false,error:String(result.error)},{status:400,headers});
    }
    const message=intent==="delete-asset"
      ? pick(locale,"Asset deleted.","تم حذف الملف.")
      : intent==="delete-design"
        ? pick(locale,"Design deleted.","تم حذف التصميم.")
        : intent==="set-cover"
          ? pick(locale,"Main Display Image updated.","تم تحديث الصورة الرئيسية.")
          : pick(locale,"Ready-to-Print Master updated.","تم تحديث ملف الطباعة الرئيسي.");
    return Response.json({ok:true,message},{headers});
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:pick(locale,"Designer action failed.","فشل إجراء المصمم.")};
  }
}

function statusClass(value:string){return String(value).toLowerCase()==="passed"?"designer-status passed":String(value).toLowerCase()==="failed"?"designer-status failed":"designer-status pending";}

export default function DesignerDashboard(){
  const data=useLoaderData<typeof loader>() as any;
  const result=useActionData<typeof action>() as any;
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const designs=data.designs??[];
  const preflightLabel=(value:string)=>String(value).toLowerCase()==="passed"?t("passed","مقبول"):String(value).toLowerCase()==="failed"?t("failed","مرفوض"):t("pending","قيد الفحص");
  return <main className="studio-shell designer-shell" dir={localeDir(locale)}>
    <header className="site-header container">
      <Link className="back-link" to="/"><ArrowLeft size={17}/></Link>
      <span className="page-title">{t("Designer Dashboard","لوحة المصمم")}</span>
      <Link className="button button-primary" to="/designer/new-design"><Plus size={16}/> {t("New Design","تصميم جديد")}</Link>
    </header>
    <section className="container designer-page">
      <div className="designer-hero">
        <div><span className="eyebrow">{t("AUTHORIZED DESIGNER","مصمم معتمد")}</span><h1>{t("Your design studio.","استوديو تصاميمك.")}</h1><p>{t("One large cover per design. Open a design to review every uploaded asset, preflight result, Main Display Image, and Ready-to-Print Master.","صورة رئيسية كبيرة لكل تصميم. افتح التصميم لمراجعة جميع الملفات المرفوعة ونتائج الفحص والصورة الرئيسية وملف الطباعة الرئيسي.")}</p></div>
        <div className="designer-hero-stat"><ShieldCheck size={22}/><b>{designs.length}</b><span>{t("Designs","تصاميم")}</span></div>
      </div>
      {result?.error&&<div className="auth-error">{result.error}</div>}
      {result?.message&&<div className="designer-success"><CheckCircle2 size={16}/>{result.message}</div>}
      {designs.length===0?<div className="designer-empty"><UploadCloud size={34}/><h2>{t("No designs yet.","لا توجد تصاميم بعد.")}</h2><p>{t("Create your first bilingual design and upload the real production assets.","أنشئ أول تصميم ثنائي اللغة وارفع ملفات الإنتاج الحقيقية.")}</p><Link className="button button-primary" to="/designer/new-design">{t("Create New Design","إنشاء تصميم جديد")}</Link></div>:
      <div className="designer-design-grid">{designs.map((d:any)=>{
        const cover=d.assets?.find((a:any)=>a.isCover)??d.assets?.find((a:any)=>a.previewable);
        return <article className="designer-design-card" key={d.designId}>
          <div className="designer-cover">{cover?.mimeType?.startsWith("image/")?<img src={"/designer/assets/"+encodeURIComponent(cover.assetId)} alt={locale==="ar"?(d.titleAr||d.titleEn):d.titleEn}/>:<FileImage size={52}/>}<span className="designer-card-status">{d.status}</span></div>
          <div className="designer-card-body"><h2>{locale==="ar"?(d.titleAr||d.titleEn):d.titleEn}</h2><p>{locale==="ar"?d.titleEn:d.titleAr}</p><div className="designer-card-meta"><span>{productTypeLabel(locale,d.productType)}</span><span>{d.assets?.length??0} {t("assets","ملفات")}</span></div></div>
          <details className="designer-detail"><summary>{t("Open design assets","فتح ملفات التصميم")}</summary><div className="designer-assets">
            {(d.assets??[]).map((a:any)=><div className="designer-asset-row" key={a.assetId}>
              <div className="designer-asset-thumb">{a.mimeType?.startsWith("image/")?<img src={"/designer/assets/"+encodeURIComponent(a.assetId)} alt={a.filename}/>:<FileImage size={28}/>}</div>
              <div className="designer-asset-copy"><b>{a.filename}</b><small>{a.pixelWidth||"—"}×{a.pixelHeight||"—"} · DPI {a.effectiveDpi||a.embeddedDpi||"n/a"}</small><div className="designer-badges">{a.isCover&&<span>{t("Main Display","الصورة الرئيسية")}</span>}{a.isMaster&&<span className="master">{t("Print Master","ملف الطباعة")}</span>}<span className={statusClass(a.preflightStatus)}>{preflightLabel(a.preflightStatus)}</span></div></div>
              <div className="designer-asset-actions">
                {!a.isCover&&<Form method="post"><input type="hidden" name="intent" value="set-cover"/><input type="hidden" name="designId" value={d.designId}/><input type="hidden" name="assetId" value={a.assetId}/><button title={t("Set Main Display Image","تعيين كصورة رئيسية")}>{t("Cover","رئيسية")}</button></Form>}
                {!a.isMaster&&a.preflightStatus==="passed"&&<Form method="post"><input type="hidden" name="intent" value="set-master"/><input type="hidden" name="designId" value={d.designId}/><input type="hidden" name="assetId" value={a.assetId}/><button title={t("Set Ready-to-Print Master","تعيين كملف طباعة رئيسي")}>{t("Master","ماستر")}</button></Form>}
                <Form method="post"><input type="hidden" name="intent" value="delete-asset"/><input type="hidden" name="assetId" value={a.assetId}/><button className="danger-small" disabled={Boolean(a.protected)} title={a.protected?t("Protected by order/production","محمي بسبب طلب/إنتاج"):t("Delete asset","حذف الملف")}><Trash2 size={14}/></button></Form>
              </div>
            </div>)}
          </div><Form method="post" className="designer-delete-design"><input type="hidden" name="intent" value="delete-design"/><input type="hidden" name="designId" value={d.designId}/><button><Trash2 size={14}/> {t("Delete Design","حذف التصميم")}</button></Form></details>
        </article>;
      })}</div>}
    </section>
  </main>;
}
