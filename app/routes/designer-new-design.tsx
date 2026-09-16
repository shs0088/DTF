import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/designer-new-design";
import type { ItemStore } from "../../workers/item-store";
import { analyzeUpload, DESIGN_PRODUCT_TYPES } from "../../workers/analyzer";
import { inspectUpload } from "../../workers/upload-inspection";
import { ArrowLeft, CheckCircle2, FileImage, Image as ImageIcon, Printer, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export async function loader({request,context}:Route.LoaderArgs){
  const sessionId=cookieValue(request,"dtf_session"),s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design");
  try{await s.designerWorkspace(sessionId);}catch{throw redirect("/designer-qualification");}
  const settings:any=(await s.businessSettingsSnapshot() as any).settings;
  return {
    productTypes:[...DESIGN_PRODUCT_TYPES],
    maxFileSizeBytes:Number(settings.artworkValidationRules?.maxFileSizeBytes||20971520),
    allowedFormats:Array.isArray(settings.artworkValidationRules?.allowedFormats)?settings.artworkValidationRules.allowedFormats:["image/png","image/jpeg","image/webp","image/svg+xml","application/pdf"],
    minDpi:Number(settings.artworkValidationRules?.minDpi||300),
  };
}

export async function action({request,context}:Route.ActionArgs){
  const sessionId=cookieValue(request,"dtf_session"),s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="designer")throw redirect("/login?returnTo=%2Fdesigner%2Fnew-design");
  let workspace:any;
  try{workspace=await s.designerWorkspace(sessionId);}catch{return {ok:false,error:"Designer Dashboard is available after qualification approval."};}
  const bucket=designBucket(context);
  if(!bucket)return {ok:false,error:"Private design asset storage is not configured in this environment."};
  const form=await request.formData();
  const settings:any=(await s.businessSettingsSnapshot() as any).settings;
  const artwork=settings.artworkValidationRules??{};
  const maxBytes=Number(artwork.maxFileSizeBytes||20971520);
  const minDpi=Number(artwork.minDpi||300);
  const allowed=new Set<string>((artwork.allowedFormats??["image/png","image/jpeg","image/webp","image/svg+xml","application/pdf"]).map((x:any)=>String(x).toLowerCase()));
  const titleEn=String(form.get("titleEn")??"").trim(),titleAr=String(form.get("titleAr")??"").trim();
  const descriptionEn=String(form.get("descriptionEn")??"").trim(),descriptionAr=String(form.get("descriptionAr")??"").trim();
  const productType=String(form.get("productType")??"").trim();
  if(!DESIGN_PRODUCT_TYPES.includes(productType as any))return {ok:false,error:"Select one of the seven supported Product Type combinations."};
  const files=form.getAll("files").filter((x):x is File=>x instanceof File&&x.size>0);
  if(!files.length)return {ok:false,error:"Upload at least one design file."};
  if(files.length>20)return {ok:false,error:"A design can contain up to 20 uploaded assets."};
  const masterIndex=Number(form.get("masterIndex"));
  const coverIndex=Number(form.get("coverIndex")??-1);
  if(!Number.isInteger(masterIndex)||masterIndex<0||masterIndex>=files.length)return {ok:false,error:"Please explicitly select exactly one Ready-to-Print Master."};
  if(coverIndex>=files.length||coverIndex<-1)return {ok:false,error:"Main Display Image selection is invalid."};
  const designId="design-"+crypto.randomUUID();
  const storedKeys:string[]=[];
  try{
    const assets:any[]=[];
    for(let index=0;index<files.length;index++){
      const file=files[index];
      if(file.size>maxBytes)throw new Error(`${file.name}: file exceeds the configured ${Math.round(maxBytes/1024/1024)} MB limit.`);
      const bytes=await file.arrayBuffer();
      const analysis=inspectUpload(bytes);
      if(!analysis.signatureValid)throw new Error(`${file.name}: file signature is not a supported artwork format.`);
      if(!allowed.has(analysis.mime))throw new Error(`${file.name}: ${mimeLabel(analysis.mime)} is disabled in Artwork Settings.`);
      const browserMime=normalizeBrowserMime(file.type||"");
      if(browserMime&&browserMime!==analysis.mime)throw new Error(`${file.name}: browser MIME and file signature do not match.`);
      const atoms=productType.split("+");
      const results=atoms.map((atom)=>{
        const area=PRINT_AREAS[atom];
        if(!area)throw new Error("Unsupported Product Type component: "+atom);
        const physicalWidth=analysis.embeddedDpi&&analysis.pixelWidth?analysis.pixelWidth/analysis.embeddedDpi:undefined;
        const physicalHeight=analysis.embeddedDpi&&analysis.pixelHeight?analysis.pixelHeight/analysis.embeddedDpi:undefined;
        return {atom,result:analyzeUpload({
          filename:file.name,format:analysis.format,mime:analysis.mime,byteSize:file.size,signatureValid:analysis.signatureValid,
          pixelWidth:analysis.pixelWidth,pixelHeight:analysis.pixelHeight,embeddedDpi:analysis.embeddedDpi??undefined,
          physicalWidthIn:physicalWidth,physicalHeightIn:physicalHeight,hasAlpha:analysis.hasAlpha,
          productPrintWidthIn:area.width,productPrintHeightIn:area.height,productType:atom,minDpi
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
        placeholderCheck:results.every(x=>x.result.placeholderCheck),
        productChecks:results.map(x=>({productType:x.atom,passed:x.result.passed,effectiveDpi:x.result.effectiveDpi,errors:x.result.errors,warnings:x.result.warnings}))
      };
      if(index===masterIndex&&!passed)throw new Error(`${file.name}: selected Ready-to-Print Master failed preflight. ${errors.join(" ")}`);
      const assetId="asset-"+crypto.randomUUID();
      const safeName=(file.name||"asset").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-160);
      const storageKey=`designer/${workspace.designer.userId}/${designId}/${assetId}-${safeName}`;
      await bucket.put(storageKey,bytes,{httpMetadata:{contentType:analysis.mime},customMetadata:{originalFilename:file.name.slice(0,240),designerId:String(workspace.designer.userId),designId}});
      storedKeys.push(storageKey);
      assets.push({assetId,storageKey,filename:file.name,mime:analysis.mime,byteSize:file.size,analysis,preflight,isMaster:index===masterIndex,isCover:index===coverIndex});
    }
    const created:any=await s.createDesignerDesign(sessionId,{designId,titleEn,titleAr,descriptionEn,descriptionAr,productType,assets});
    return redirect("/designer?created="+encodeURIComponent(String(created?.designId||designId)));
  }catch(error){
    for(const key of storedKeys)try{await bucket.delete(key);}catch{}
    return {ok:false,error:error instanceof Error?error.message:"Design upload failed."};
  }
}

export default function NewDesign(){
  const data=useLoaderData<typeof loader>() as any;
  const result=useActionData<typeof action>() as any;
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
  return <main className="studio-shell designer-shell" dir="ltr">
    <header className="site-header container"><Link className="back-link" to="/designer"><ArrowLeft size={17}/></Link><span className="page-title">New Design</span><span className="designer-upload-policy">Up to {maxMb} MB / file · Min DPI {data.minDpi}</span></header>
    <section className="container designer-page">
      <div className="designer-hero compact"><div><span className="eyebrow">DESIGN WORKSPACE</span><h1>Create a production-ready design.</h1><p>Upload multiple assets. Main Display Image is optional; if you leave it on Auto, the system chooses a suitable recent preview. Ready-to-Print Master is mandatory and is never auto-selected.</p></div></div>
      {result?.error&&<div className="auth-error">{result.error}</div>}
      <Form method="post" encType="multipart/form-data" className="designer-new-form">
        <section className="designer-form-card"><h2>1. Bilingual design details</h2><div className="designer-form-grid">
          <label>English Title<input name="titleEn" required maxLength={240}/></label>
          <label dir="rtl">العنوان بالعربية<input name="titleAr" required maxLength={240} dir="rtl"/></label>
          <label>English Description<textarea name="descriptionEn" required rows={4} maxLength={5000}/></label>
          <label dir="rtl">الوصف بالعربية<textarea name="descriptionAr" required rows={4} maxLength={5000} dir="rtl"/></label>
        </div></section>
        <section className="designer-form-card"><h2>2. Product Type</h2><p className="designer-form-help">Choose exactly one of the seven approved combinations.</p><div className="designer-type-grid">
          {data.productTypes.map((type:string)=><label className="designer-type-option" key={type}><input type="radio" name="productType" value={type} required/><span>{type}</span></label>)}
        </div></section>
        <section className="designer-form-card"><h2>3. Upload design assets</h2><label className="designer-dropzone"><UploadCloud size={34}/><b>Choose multiple files</b><span>PNG · JPEG · WebP · SVG · PDF</span><small>Server verifies the real file signature, dimensions, DPI/preflight and Product Type compatibility.</small><input type="file" name="files" multiple required accept={accept} onChange={e=>chooseFiles(e.currentTarget.files)}/></label>
          {selected.length>0&&<div className="designer-selected-assets"><div className="designer-selection-head"><span>Asset</span><span><ImageIcon size={14}/> Main Display</span><span><Printer size={14}/> Print Master</span></div>
            <label className="designer-auto-cover"><input type="radio" name="coverIndex" value="-1" checked={cover===-1} onChange={()=>setCover(-1)}/> Auto-select suitable cover if none chosen</label>
            {selected.map((x,index)=><div className="designer-selected-row" key={index}>
              <div className="designer-selected-preview">{x.url?<img src={x.url} alt={x.file.name}/>:<FileImage size={30}/>}<div><b>{x.file.name}</b><small>{(x.file.size/1024/1024).toFixed(2)} MB · {x.file.type||"signature-detected"}</small></div></div>
              <label className="designer-radio"><input type="radio" name="coverIndex" value={index} checked={cover===index} onChange={()=>setCover(index)}/><span>Cover</span></label>
              <label className="designer-radio master"><input type="radio" name="masterIndex" value={index} required checked={master===index} onChange={()=>setMaster(index)}/><span>Master</span></label>
            </div>)}
          </div>}
        </section>
        <div className="designer-submit-bar"><div><CheckCircle2 size={17}/><span>Design is saved only after the selected Print Master passes server-side preflight.</span></div><button className="button button-primary" type="submit" disabled={navigation.state!=="idle"||selected.length===0||master<0}>{navigation.state==="submitting"?"Uploading & validating…":"Create Design"}</button></div>
      </Form>
    </section>
  </main>;
}
