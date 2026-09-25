import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/designer-new-design";
import { ArrowLeft, CheckCircle2, FileImage, Image as ImageIcon, Printer, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { localeDir, localeFromRequest, pick, productTypeLabel, useAppLocale } from "../i18n";
import {
  appendOdooSessionCookies,
  fetchOdooResponse,
} from "../lib/odoo-api.server";

function message(locale:"en"|"ar",en:string,ar:string){return locale==="ar"?ar:en;}

function uploadError(locale:"en"|"ar",code:string){
  const map:Record<string,[string,string]>={
    bilingual_fields_required:["Complete all four bilingual design fields.","أكمل حقول التصميم الأربعة باللغتين."],
    invalid_product_type:["Select one of the seven supported Product Type combinations.","اختر تركيبة واحدة من تركيبات أنواع المنتجات السبعة المعتمدة."],
    files_required:["Upload at least one design file.","ارفع ملف تصميم واحداً على الأقل."],
    too_many_files:["A design can contain up to 20 uploaded assets.","يمكن أن يحتوي التصميم على 20 ملفاً مرفوعاً كحد أقصى."],
    master_selection_required:["Please explicitly select exactly one Ready-to-Print Master.","يرجى تحديد ملف طباعة رئيسي واحد بشكل صريح."],
    cover_selection_invalid:["Main Display Image selection is invalid.","اختيار الصورة الرئيسية غير صالح."],
    preflight_rule_missing:["Preflight rules are not configured for this Product Type.","لم يتم إعداد قواعد الفحص المسبق لنوع المنتج هذا."],
    preflight_target_size_missing:["Printable dimensions must be configured before raster Master preflight.","يجب إعداد أبعاد الطباعة قبل فحص الملف الرئيسي النقطي."],
    file_too_large:["One uploaded file exceeds the configured upload limit.","يتجاوز أحد الملفات المرفوعة الحد المسموح به."],
    unsupported_file:["One uploaded file has an unsupported format or invalid signature.","أحد الملفات المرفوعة بتنسيق غير مدعوم أو توقيعه غير صالح."],
    mime_mismatch:["A file MIME type does not match its real signature.","نوع MIME لأحد الملفات لا يطابق توقيعه الحقيقي."],
    master_preflight_failed:["The selected Ready-to-Print Master failed native Odoo preflight.","فشل ملف الطباعة الرئيسي المحدد في الفحص المسبق الأصلي لأودو."],
  };
  const pair=map[code]??["Design upload failed.","فشل رفع التصميم."];
  return message(locale,pair[0],pair[1]);
}

export async function loader({request,context}:Route.LoaderArgs){
  const upstream=await fetchOdooResponse(
    request,
    context,
    "/api/dtf/v1/designer/upload-config",
  );
  const headers=new Headers();
  appendOdooSessionCookies(headers,upstream);
  if([301,302,303,401,403].includes(upstream.status)){
    throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design",{headers});
  }
  if(upstream.status===409){
    throw redirect("/designer-qualification",{headers});
  }
  if(!upstream.ok) throw new Response("Designer upload configuration unavailable.",{status:502});
  const payload=await upstream.json() as any;
  return Response.json({
    locale:localeFromRequest(request),
    productTypes:payload.productTypes??[],
    maxFileSizeBytes:Number(payload.maxFileSizeBytes??20971520),
    allowedFormats:Array.isArray(payload.allowedFormats)?payload.allowedFormats:[],
    minDpi:Number(payload.minDpi??300),
  },{headers});
}

export async function action({request,context}:Route.ActionArgs){
  const locale=localeFromRequest(request);
  const form=await request.formData();
  const upstream=await fetchOdooResponse(
    request,
    context,
    "/api/dtf/v1/designer/designs/create",
    {method:"POST",body:form},
  );
  const headers=new Headers();
  appendOdooSessionCookies(headers,upstream);
  if([301,302,303,401,403].includes(upstream.status)){
    throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design",{headers});
  }
  const payload=await upstream.json().catch(()=>({})) as any;
  if(upstream.status===409&&payload?.error==="qualification_required"){
    throw redirect("/designer-qualification",{headers});
  }
  if(!upstream.ok||!payload?.ok){
    return Response.json({
      ok:false,
      error:uploadError(locale,String(payload?.error??"upload_failed")),
    },{status:400,headers});
  }
  const designId=String(payload?.design?.designId??"");
  headers.set("Location","/designer?created="+encodeURIComponent(designId));
  return new Response(null,{status:303,headers});
}

export default function NewDesign(){
  const data=useLoaderData<typeof loader>() as any;
  const result=useActionData<typeof action>() as any;
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const navigation=useNavigation();
  const [selected,setSelected]=useState<Array<{file:File,url:string|null}>>([]);
  const [master,setMaster]=useState<number>(-1);
  const [cover,setCover]=useState<number>(-1);
  useEffect(()=>()=>{for(const x of selected)if(x.url)URL.revokeObjectURL(x.url);},[selected]);
  const accept=useMemo(()=>data.allowedFormats.join(","),[data.allowedFormats]);
  const maxMb=Math.round(Number(data.maxFileSizeBytes)/1024/1024);
  function chooseFiles(list:FileList|null){
    for(const x of selected)if(x.url)URL.revokeObjectURL(x.url);
    const next=Array.from(list??[]).slice(0,20).map(file=>({file,url:file.type.startsWith("image/")&&file.type!=="image/svg+xml"?URL.createObjectURL(file):null}));
    setSelected(next);setMaster(-1);setCover(-1);
  }
  return <main className="studio-shell designer-shell" dir={localeDir(locale)}>
    <header className="site-header container"><Link className="back-link" to="/designer"><ArrowLeft size={17}/></Link><span className="page-title">{t("New Design","تصميم جديد")}</span><span className="designer-upload-policy">{t(`Up to ${maxMb} MB / file · Min DPI ${data.minDpi}`,`حتى ${maxMb} MB لكل ملف · الحد الأدنى للدقة ${data.minDpi}`)}</span></header>
    <section className="container designer-page">
      <div className="designer-hero compact"><div><span className="eyebrow">{t("DESIGN WORKSPACE","مساحة عمل التصميم")}</span><h1>{t("Create a production-ready design.","أنشئ تصميماً جاهزاً للإنتاج.")}</h1><p>{t("Upload multiple assets. Main Display Image is optional; if you leave it on Auto, the system chooses a suitable recent preview. Ready-to-Print Master is mandatory and is never auto-selected.","ارفع عدة ملفات. الصورة الرئيسية اختيارية؛ عند تركها تلقائياً يختار النظام معاينة مناسبة. ملف الطباعة الرئيسي إلزامي ولا يتم اختياره تلقائياً أبداً.")}</p></div></div>
      {result?.error&&<div className="auth-error">{result.error}</div>}
      <Form method="post" encType="multipart/form-data" className="designer-new-form">
        <section className="designer-form-card"><h2>{t("1. Bilingual design details","1. تفاصيل التصميم الثنائية اللغة")}</h2><div className="designer-form-grid">
          <label>{t("English Title","العنوان بالإنجليزية")}<input name="titleEn" required maxLength={240}/></label>
          <label dir="rtl">{t("Arabic Title","العنوان بالعربية")}<input name="titleAr" required maxLength={240} dir="rtl"/></label>
          <label>{t("English Description","الوصف بالإنجليزية")}<textarea name="descriptionEn" required rows={4} maxLength={5000}/></label>
          <label dir="rtl">{t("Arabic Description","الوصف بالعربية")}<textarea name="descriptionAr" required rows={4} maxLength={5000} dir="rtl"/></label>
        </div></section>
        <section className="designer-form-card"><h2>{t("2. Product Type","2. نوع المنتج")}</h2><p className="designer-form-help">{t("Choose exactly one of the seven approved combinations.","اختر تركيبة واحدة فقط من التركيبات السبعة المعتمدة.")}</p><div className="designer-type-grid">
          {data.productTypes.map((type:string)=><label className="designer-type-option" key={type}><input type="radio" name="productType" value={type} required/><span>{productTypeLabel(locale,type)}</span></label>)}
        </div></section>
        <section className="designer-form-card"><h2>{t("3. Upload design assets","3. رفع ملفات التصميم")}</h2><label className="designer-dropzone"><UploadCloud size={34}/><b>{t("Choose multiple files","اختر عدة ملفات")}</b><span>PNG · JPEG · WebP · SVG · PDF</span><small>{t("Server verifies the real file signature, dimensions, DPI/preflight and Product Type compatibility.","يتحقق الخادم من توقيع الملف الحقيقي والأبعاد والدقة والفحص المسبق وتوافق نوع المنتج.")}</small><input type="file" name="files" multiple required accept={accept} onChange={e=>chooseFiles(e.currentTarget.files)}/></label>
          {selected.length>0&&<div className="designer-selected-assets"><div className="designer-selection-head"><span>{t("Asset","الملف")}</span><span><ImageIcon size={14}/> {t("Main Display","الصورة الرئيسية")}</span><span><Printer size={14}/> {t("Print Master","ملف الطباعة الرئيسي")}</span></div>
            <label className="designer-auto-cover"><input type="radio" name="coverIndex" value="-1" checked={cover===-1} onChange={()=>setCover(-1)}/> {t("Auto-select suitable cover if none chosen","اختيار صورة رئيسية مناسبة تلقائياً عند عدم التحديد")}</label>
            {selected.map((x,index)=><div className="designer-selected-row" key={index}>
              <div className="designer-selected-preview">{x.url?<img src={x.url} alt={x.file.name}/>:<FileImage size={30}/>}<div><b>{x.file.name}</b><small>{(x.file.size/1024/1024).toFixed(2)} MB · {x.file.type||"signature-detected"}</small></div></div>
              <label className="designer-radio"><input type="radio" name="coverIndex" value={index} disabled={!x.file.type.startsWith("image/")} checked={cover===index} onChange={()=>setCover(index)}/><span>{x.file.type.startsWith("image/")?t("Cover","رئيسية"):t("Image only","صورة فقط")}</span></label>
              <label className="designer-radio master"><input type="radio" name="masterIndex" value={index} required checked={master===index} onChange={()=>setMaster(index)}/><span>{t("Ready-to-Print Master","ملف الطباعة الرئيسي")}</span></label>
            </div>)}
          </div>}
        </section>
        <div className="designer-submit-bar"><div><CheckCircle2 size={17}/><span>{t("Design is saved only after the selected Ready-to-Print Master passes server-side preflight.","لا يُحفظ التصميم إلا بعد اجتياز ملف الطباعة الرئيسي المحدد للفحص المسبق على الخادم.")}</span></div><button className="button button-primary" type="submit" disabled={navigation.state!=="idle"||selected.length===0||master<0}>{navigation.state==="submitting"?t("Uploading & validating…","جارٍ الرفع والتحقق…"):t("Create Design","إنشاء التصميم")}</button></div>
      </Form>
    </section>
  </main>;
}
