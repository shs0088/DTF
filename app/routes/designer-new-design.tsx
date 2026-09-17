import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/designer-new-design";
import type { ItemStore } from "../../workers/item-store";
import { analyzeAsset, DESIGN_PRODUCT_TYPES } from "../../workers/analyzer";
import { inspectUpload } from "../../workers/upload-inspection";
import { ArrowLeft, CheckCircle2, FileImage, Image as ImageIcon, Printer, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { localeDir, localeFromRequest, pick, productTypeLabel, useAppLocale } from "../i18n";

function cookieValue(request:Request,name:string){
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function store(context:Route.LoaderArgs["context"]|Route.ActionArgs["context"]){
  const ns=context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return ns.get(ns.idFromName("default"));
}
function designBucket(context:Route.ActionArgs["context"]){
  return (context.cloudflare.env as any).DESIGN_ASSETS as R2Bucket|undefined;
}
const PRINT_AREAS:Record<string,{width:number;height:number}>={
  "T-Shirt":{width:12,height:16},
  "Mug":{width:9,height:3.75},
  "Cap":{width:4,height:2.5},
};
function mimeLabel(mime:string){
  return mime==="image/png"?"PNG":mime==="image/jpeg"?"JPEG":mime==="image/webp"?"WebP":mime==="image/svg+xml"?"SVG":mime==="application/pdf"?"PDF":mime;
}
function normalizeBrowserMime(value:string){return value.toLowerCase()==="image/jpg"?"image/jpeg":value.toLowerCase();}
function message(locale:"en"|"ar",en:string,ar:string){return locale==="ar"?ar:en;}

export async function loader({request,context}:Route.LoaderArgs){
  const sessionId=cookieValue(request,"dtf_session"),s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design");
  try{await s.designerWorkspace(sessionId);}catch{throw redirect("/designer-qualification");}
  const settings:any=(await s.businessSettingsSnapshot() as any).settings;
  return {
    locale: localeFromRequest(request),
    productTypes:[...DESIGN_PRODUCT_TYPES],
    maxFileSizeBytes:Number(settings.artworkValidationRules?.maxFileSizeBytes||20971520),
    allowedFormats:Array.isArray(settings.artworkValidationRules?.allowedFormats)?settings.artworkValidationRules.allowedFormats:["image/png","image/jpeg","image/webp","image/svg+xml","application/pdf"],
    minDpi:Number(settings.artworkValidationRules?.minDpi||300),
  };
}

export async function action({request,context}:Route.ActionArgs){
  const locale=localeFromRequest(request);
  const sessionId=cookieValue(request,"dtf_session"),s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design");
  let workspace:any;
  try{workspace=await s.designerWorkspace(sessionId);}catch{return {ok:false,error:message(locale,"Designer Dashboard is available after qualification approval.","لوحة المصمم متاحة بعد اجتياز التأهيل والموافقة.")};}
  const bucket=designBucket(context);
  if(!bucket)return {ok:false,error:message(locale,"Private design asset storage is not configured in this environment.","لم يتم إعداد التخزين الخاص لملفات التصميم في هذه البيئة.")};
  const form=await request.formData();
  const settings:any=(await s.businessSettingsSnapshot() as any).settings;
  const artwork=settings.artworkValidationRules??{};
  const maxBytes=Number(artwork.maxFileSizeBytes||20971520);
  const minDpi=Number(artwork.minDpi||300);
  const allowed=new Set<string>((artwork.allowedFormats??["image/png","image/jpeg","image/webp","image/svg+xml","application/pdf"]).map((x:any)=>String(x).toLowerCase()));
  const titleEn=String(form.get("titleEn")??"").trim(),titleAr=String(form.get("titleAr")??"").trim();
  const descriptionEn=String(form.get("descriptionEn")??"").trim(),descriptionAr=String(form.get("descriptionAr")??"").trim();
  const productType=String(form.get("productType")??"").trim();
  if(!DESIGN_PRODUCT_TYPES.includes(productType as any))return {ok:false,error:message(locale,"Select one of the seven supported Product Type combinations.","اختر تركيبة واحدة من تركيبات أنواع المنتجات السبعة المعتمدة.")};
  const files=form.getAll("files").filter((x):x is File=>x instanceof File&&x.size>0);
  if(!files.length)return {ok:false,error:message(locale,"Upload at least one design file.","ارفع ملف تصميم واحداً على الأقل.")};
  if(files.length>20)return {ok:false,error:message(locale,"A design can contain up to 20 uploaded assets.","يمكن أن يحتوي التصميم على 20 ملفاً مرفوعاً كحد أقصى.")};
  const masterIndex=Number(form.get("masterIndex"));
  const coverIndex=Number(form.get("coverIndex")??-1);
  if(!Number.isInteger(masterIndex)||masterIndex<0||masterIndex>=files.length)return {ok:false,error:message(locale,"Please explicitly select exactly one Ready-to-Print Master.","يرجى تحديد ملف طباعة رئيسي واحد بشكل صريح.")};
  if(coverIndex>=files.length||coverIndex<-1)return {ok:false,error:message(locale,"Main Display Image selection is invalid.","اختيار الصورة الرئيسية غير صالح.")};
  const designId="design-"+crypto.randomUUID();
  const storedKeys:string[]=[];
  try{
    const assets:any[]=[];
    for(let index=0;index<files.length;index++){
      const file=files[index];
      if(file.size>maxBytes)throw new Error(message(locale,`${file.name}: file exceeds the configured ${Math.round(maxBytes/1024/1024)} MB limit.`,`${file.name}: يتجاوز الملف الحد المسموح به وهو ${Math.round(maxBytes/1024/1024)} MB.`));
      const bytes=await file.arrayBuffer();
      const analysis=inspectUpload(bytes);
      if(!analysis.signatureValid)throw new Error(message(locale,`${file.name}: file signature is not a supported artwork format.`,`${file.name}: توقيع الملف ليس من تنسيقات الأعمال الفنية المدعومة.`));
      if(!allowed.has(analysis.mime))throw new Error(message(locale,`${file.name}: ${mimeLabel(analysis.mime)} is disabled in Artwork Settings.`,`${file.name}: تنسيق ${mimeLabel(analysis.mime)} معطل في إعدادات الأعمال الفنية.`));
      const browserMime=normalizeBrowserMime(file.type||"");
      if(browserMime&&browserMime!==analysis.mime)throw new Error(message(locale,`${file.name}: browser MIME and file signature do not match.`,`${file.name}: نوع MIME في المتصفح لا يطابق توقيع الملف.`));
      const atoms=productType.split("+").map(x=>x.trim());
      const results=atoms.map((atom)=>{
        const area=PRINT_AREAS[atom];
        if(!area)throw new Error(message(locale,"Unsupported Product Type component: "+atom,"مكوّن نوع المنتج غير مدعوم: "+atom));
        return {atom,result:analyzeAsset({
          format:analysis.format,mime:analysis.mime,byteSize:file.size,signatureValid:analysis.signatureValid,
          pixelWidth:analysis.pixelWidth,pixelHeight:analysis.pixelHeight,embeddedDpi:analysis.embeddedDpi,
          intendedWidthIn:area.width,intendedHeightIn:area.height,hasAlpha:analysis.hasAlpha,
          previewable:analysis.previewable,productType:atom,minDpi
        })};
      });
      const passed=results.every(x=>x.result.passed);
      const errors=[...new Set(results.flatMap(x=>x.result.errors.map(e=>`${x.atom}: ${e}`)))];
      const warnings=[...new Set(results.flatMap(x=>x.result.warnings.map(e=>`${x.atom}: ${e}`)))];
      const dpiValues=results.map(x=>x.result.effectiveDpi?.minimum).filter((x):x is number=>typeof x==="number");
      const riskRank:Record<string,number>={none:0,warning:1,critical:2};
      const scalingRisk=results.map(x=>x.result.scalingRisk).sort((a,b)=>(riskRank[b]??0)-(riskRank[a]??0))[0]??"none";
      const preflight={
        passed,errors,warnings,readable:results.every(x=>x.result.readable),analyzable:results.every(x=>x.result.analyzable),
        previewable:results.every(x=>x.result.previewable)&&analysis.previewable,
        effectiveDpi:dpiValues.length?{minimum:Math.min(...dpiValues),width:null,height:null}:null,
        physicalSizeIn:results[0]?.result.physicalSizeIn??null,scalingRisk,
        placeholderCheck:results.map(x=>({productType:x.atom,...x.result.placeholderCheck})),
        productChecks:results.map(x=>({productType:x.atom,passed:x.result.passed,effectiveDpi:x.result.effectiveDpi,errors:x.result.errors,warnings:x.result.warnings}))
      };
      if(index===masterIndex&&!passed)throw new Error(message(locale,`${file.name}: selected Ready-to-Print Master failed preflight. ${errors.join(" ")}`,`${file.name}: فشل ملف الطباعة الرئيسي المحدد في الفحص المسبق. ${errors.join(" ")}`));
      const assetId="asset-"+crypto.randomUUID();
      const safeName=(file.name||"asset").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-160);
      const storageKey=`designer/${workspace.designer.userId}/${designId}/${assetId}-${safeName}`;
      await bucket.put(storageKey,bytes,{httpMetadata:{contentType:analysis.mime},customMetadata:{originalFilename:file.name.slice(0,240),designerId:String(workspace.designer.userId),designId}});
      storedKeys.push(storageKey);
      assets.push({assetId,storageKey,filename:file.name,mime:analysis.mime,byteSize:file.size,analysis,preflight,isMaster:index===masterIndex,isCover:index===coverIndex});
    }
    const created:any=await s.createDesignerDesign(sessionId,{designId,titleEn,titleAr,descriptionEn,descriptionAr,productType,minDpi,assets});
    return redirect("/designer?created="+encodeURIComponent(String(created?.designId||designId)));
  }catch(error){
    for(const key of storedKeys)try{await bucket.delete(key);}catch{}
    return {ok:false,error:error instanceof Error?error.message:message(locale,"Design upload failed.","فشل رفع التصميم.")};
  }
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
