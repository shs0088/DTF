from pathlib import Path
from uuid import uuid4
import json
from fastapi import FastAPI,UploadFile,File,Form,HTTPException,Request
from fastapi.responses import HTMLResponse,JSONResponse,FileResponse
from pipeline import inspect_master
from jobs import PersistentJobQueue
from profile_loader import load_output_profile,calibration_readiness
from runtime_cleanup import cleanup_runtime
from settings import load_settings
from operations import create_candidate,SUPPORTED
from candidate_manager import CandidateManager
from asset_registry import AssetRegistry
from calibration_chart import generate_calibration_chart
from calibration_results import build_profile_from_observations
from acceptance import accept_candidate_as_new_master
from prepress_package import create_prepress_package
from batch import analyze_batch
from report_html import render_report_html
from self_check import run_self_check
from opencart_adapter import evaluate_order_item,ALLOWED_PRODUCT_TYPES
from mockup_asset import inspect_mockup_asset

BASE_DIR=Path(__file__).resolve().parent
settings=load_settings()
app=FastAPI(title="DTF Smart Prepress",version="0.7")
queue=PersistentJobQueue(max_workers=settings.max_workers,db_path=str(BASE_DIR/"runtime_jobs.sqlite3"))
UPLOAD_DIR=BASE_DIR/"runtime_uploads"; UPLOAD_DIR.mkdir(exist_ok=True)
CANDIDATE_DIR=BASE_DIR/"runtime_candidates"; CANDIDATE_DIR.mkdir(exist_ok=True)
CALIBRATION_DIR=BASE_DIR/"runtime_calibration"; CALIBRATION_DIR.mkdir(exist_ok=True)
MASTER_DIR=BASE_DIR/"runtime_masters"; MASTER_DIR.mkdir(exist_ok=True)
PACKAGE_DIR=BASE_DIR/"runtime_packages"; PACKAGE_DIR.mkdir(exist_ok=True)
REPORT_DIR=BASE_DIR/"runtime_reports"; REPORT_DIR.mkdir(exist_ok=True)
WEB_INDEX=BASE_DIR/"web"/"index.html"
candidate_manager=CandidateManager(str(CANDIDATE_DIR),str(BASE_DIR/"runtime_assets.sqlite3"))
asset_registry=AssetRegistry(str(BASE_DIR/"runtime_assets.sqlite3"))
cleanup_runtime(str(UPLOAD_DIR),settings.runtime_ttl_seconds)
cleanup_runtime(str(CANDIDATE_DIR),settings.runtime_ttl_seconds)
cleanup_runtime(str(CALIBRATION_DIR),settings.runtime_ttl_seconds)
cleanup_runtime(str(PACKAGE_DIR),settings.runtime_ttl_seconds)
cleanup_runtime(str(REPORT_DIR),settings.runtime_ttl_seconds)

@app.middleware("http")
async def api_key_guard(request:Request,call_next):
    if settings.api_key and request.url.path not in ("/","/health"):
        if request.headers.get("x-api-key")!=settings.api_key:
            return JSONResponse({"detail":"invalid or missing X-API-Key"},status_code=401)
    return await call_next(request)

async def _save_upload_limited(file:UploadFile,target:Path)->int:
    total=0
    try:
        with target.open("wb") as f:
            while True:
                chunk=await file.read(1024*1024)
                if not chunk: break
                total+=len(chunk)
                if total>settings.max_upload_bytes:
                    raise HTTPException(413,"upload exceeds configured byte limit")
                f.write(chunk)
        return total
    except Exception:
        target.unlink(missing_ok=True)
        raise

@app.get("/self-check")
def self_check():
    return run_self_check(str(BASE_DIR))

@app.get("/health")
def health():
    return {"ok":True,"service":"DTF Smart Prepress","version":"0.7",
            "auth_enabled":bool(settings.api_key),"max_workers":settings.max_workers,
            "candidate_operations":sorted(SUPPORTED),"max_batch_files":settings.max_batch_files,"opencart_product_types":sorted(ALLOWED_PRODUCT_TYPES)}

@app.get("/",response_class=HTMLResponse)
def home():
    return HTMLResponse(WEB_INDEX.read_text(encoding="utf-8"))

@app.post("/analyze")
async def analyze_upload(file:UploadFile=File(...),width_in:float=Form(...),height_in:float=Form(...),
                         choke_mm:float=Form(0.0),spread_mm:float=Form(0.0),
                         min_stroke_mm:float|None=Form(None),min_island_area_mm2:float|None=Form(None),
                         print_area_width_in:float|None=Form(None),print_area_height_in:float|None=Form(None),
                         allow_print_rotation:bool=Form(False),required_canvas_margin_mm:float=Form(0.0)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    try:
        return inspect_master(str(target),width_in,height_in,choke_mm,spread_mm,min_stroke_mm,min_island_area_mm2,
                              print_area_width_in=print_area_width_in,print_area_height_in=print_area_height_in,
                              allow_print_rotation=allow_print_rotation,required_canvas_margin_mm=required_canvas_margin_mm)
    finally:
        target.unlink(missing_ok=True)

@app.post("/profiles/validate")
async def validate_profile(file:UploadFile=File(...)):
    target=UPLOAD_DIR/(uuid4().hex+".json")
    await _save_upload_limited(file,target)
    try:
        profile=load_output_profile(str(target))
        return {"profile":profile,"readiness":calibration_readiness(profile)}
    finally:
        target.unlink(missing_ok=True)

@app.post("/candidates/create")
async def candidate_create(file:UploadFile=File(...),operation:str=Form(...),params_json:str=Form("{}")):
    if operation not in SUPPORTED:
        raise HTTPException(400,f"unsupported operation; choose one of {sorted(SUPPORTED)}")
    try:
        params=json.loads(params_json)
        if not isinstance(params,dict): raise ValueError()
    except Exception:
        raise HTTPException(400,"params_json must be a JSON object")
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    try:
        result=create_candidate(str(target),operation,params,candidate_manager)
        name=Path(result["candidate"]["path"]).name
        manifest=Path(result["manifest"]).name
        result["download_url"]=f"/candidates/files/{name}"
        result["manifest_url"]=f"/candidates/files/{manifest}"
        return result
    finally:
        target.unlink(missing_ok=True)

@app.get("/candidates/files/{name}")
def candidate_file(name:str):
    if Path(name).name!=name:
        raise HTTPException(400,"invalid file name")
    p=(CANDIDATE_DIR/name).resolve()
    if p.parent!=CANDIDATE_DIR.resolve() or not p.is_file():
        raise HTTPException(404,"candidate not found")
    return FileResponse(str(p),filename=p.name)

@app.get("/assets/lineage/{sha256}")
def lineage(sha256:str):
    if len(sha256)!=64 or any(c not in "0123456789abcdefABCDEF" for c in sha256):
        raise HTTPException(400,"invalid sha256")
    return {"assets":asset_registry.lineage(sha256.lower())}

@app.post("/calibration/chart")
def calibration_chart(dpi:int=Form(300),width_in:float=Form(8.27),height_in:float=Form(11.69)):
    if dpi<72 or dpi>1200: raise HTTPException(400,"dpi must be between 72 and 1200")
    stem="calibration-"+uuid4().hex
    png=CALIBRATION_DIR/(stem+".png"); manifest=CALIBRATION_DIR/(stem+".json")
    result=generate_calibration_chart(str(png),str(manifest),dpi,width_in,height_in)
    result["png_url"]=f"/calibration/files/{png.name}"
    result["manifest_url"]=f"/calibration/files/{manifest.name}"
    return result

@app.post("/calibration/profile")
async def calibration_profile(base_profile:UploadFile=File(...),observations:UploadFile=File(...)):
    base=UPLOAD_DIR/(uuid4().hex+"-base.json"); obs=UPLOAD_DIR/(uuid4().hex+"-obs.json")
    await _save_upload_limited(base_profile,base); await _save_upload_limited(observations,obs)
    out=CALIBRATION_DIR/("profile-"+uuid4().hex+".json")
    try:
        profile=build_profile_from_observations(str(base),str(obs),str(out))
        return {"profile":profile,"readiness":calibration_readiness(profile),
                "download_url":f"/calibration/files/{out.name}"}
    finally:
        base.unlink(missing_ok=True); obs.unlink(missing_ok=True)

@app.get("/calibration/files/{name}")
def calibration_file(name:str):
    if Path(name).name!=name: raise HTTPException(400,"invalid file name")
    p=(CALIBRATION_DIR/name).resolve()
    if p.parent!=CALIBRATION_DIR.resolve() or not p.is_file(): raise HTTPException(404,"calibration file not found")
    return FileResponse(str(p),filename=p.name)

@app.post("/masters/accept")
async def master_accept(candidate_name:str=Form(...),width_in:float=Form(...),height_in:float=Form(...),
                        require_calibrated_profile:bool=Form(False),output_profile:UploadFile|None=File(None)):
    if Path(candidate_name).name!=candidate_name: raise HTTPException(400,"invalid candidate name")
    candidate=(CANDIDATE_DIR/candidate_name).resolve()
    if candidate.parent!=CANDIDATE_DIR.resolve() or not candidate.is_file():
        raise HTTPException(404,"candidate not found")
    prof_path=None
    try:
        if output_profile is not None:
            p=UPLOAD_DIR/(uuid4().hex+"-profile.json")
            await _save_upload_limited(output_profile,p); prof_path=str(p)
        report=inspect_master(str(candidate),width_in,height_in,output_profile_path=prof_path,
                              require_calibrated_profile=require_calibrated_profile)
        dest=MASTER_DIR/("master-"+uuid4().hex+".png")
        accepted=accept_candidate_as_new_master(str(candidate),str(dest),report,explicit_accept=True,
                                                require_calibrated_profile=require_calibrated_profile)
        asset_registry.register(str(dest),"ready_to_print_master",accepted["source_sha256"],
                                "explicit_master_accept",{"require_calibrated_profile":require_calibrated_profile})
        return {"accepted":accepted,"report":report,"download_url":f"/masters/files/{dest.name}"}
    except (ValueError,PermissionError,FileExistsError) as e:
        raise HTTPException(422,str(e))
    finally:
        if prof_path: Path(prof_path).unlink(missing_ok=True)

@app.get("/masters/files/{name}")
def master_file(name:str):
    if Path(name).name!=name: raise HTTPException(400,"invalid file name")
    p=(MASTER_DIR/name).resolve()
    if p.parent!=MASTER_DIR.resolve() or not p.is_file(): raise HTTPException(404,"master not found")
    return FileResponse(str(p),filename=p.name)

@app.post("/packages/create")
async def package_create(file:UploadFile=File(...),width_in:float=Form(...),height_in:float=Form(...),
                         choke_mm:float=Form(0.0),spread_mm:float=Form(0.0)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    out=PACKAGE_DIR/("prepress-"+uuid4().hex+".zip")
    try:
        result=create_prepress_package(str(target),str(out),width_in,height_in,choke_mm,spread_mm)
        result["download_url"]=f"/packages/files/{out.name}"
        return result
    finally:
        target.unlink(missing_ok=True)

@app.get("/packages/files/{name}")
def package_file(name:str):
    if Path(name).name!=name: raise HTTPException(400,"invalid file name")
    p=(PACKAGE_DIR/name).resolve()
    if p.parent!=PACKAGE_DIR.resolve() or not p.is_file(): raise HTTPException(404,"package not found")
    return FileResponse(str(p),filename=p.name,media_type="application/zip")

@app.post("/batch/analyze")
async def batch_analyze(files:list[UploadFile]=File(...),width_in:float=Form(...),height_in:float=Form(...),
                        choke_mm:float=Form(0.0),spread_mm:float=Form(0.0)):
    if not files: raise HTTPException(400,"at least one file is required")
    if len(files)>settings.max_batch_files:
        raise HTTPException(413,f"batch exceeds configured file count limit ({settings.max_batch_files})")
    saved=[]
    try:
        for file in files:
            target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
            await _save_upload_limited(file,target)
            saved.append((file.filename or target.name,str(target)))
        return analyze_batch(saved,width_in,height_in,choke_mm,spread_mm)
    finally:
        for _,path in saved: Path(path).unlink(missing_ok=True)

@app.post("/reports/create")
async def report_create(file:UploadFile=File(...),width_in:float=Form(...),height_in:float=Form(...),
                        choke_mm:float=Form(0.0),spread_mm:float=Form(0.0),
                        print_area_width_in:float|None=Form(None),print_area_height_in:float|None=Form(None)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    out=REPORT_DIR/("report-"+uuid4().hex+".html")
    try:
        report=inspect_master(str(target),width_in,height_in,choke_mm,spread_mm,
                              print_area_width_in=print_area_width_in,print_area_height_in=print_area_height_in)
        render_report_html(report,str(out))
        return {"status":report.get("status"),"master_gate":report.get("master_gate"),
                "download_url":f"/reports/files/{out.name}"}
    finally:
        target.unlink(missing_ok=True)

@app.get("/reports/files/{name}")
def report_file(name:str):
    if Path(name).name!=name: raise HTTPException(400,"invalid file name")
    p=(REPORT_DIR/name).resolve()
    if p.parent!=REPORT_DIR.resolve() or not p.is_file(): raise HTTPException(404,"report not found")
    return FileResponse(str(p),filename=p.name,media_type="text/html")

@app.post("/integrations/opencart/evaluate")
async def opencart_evaluate(file:UploadFile=File(...),order_item_id:str=Form(...),product_type:str=Form(...),
                            print_width_in:float=Form(...),print_height_in:float=Form(...),
                            print_area_width_in:float=Form(...),print_area_height_in:float=Form(...),
                            master_selected:bool=Form(...),require_calibrated_profile:bool=Form(False),
                            output_profile:UploadFile|None=File(None)):
    if product_type not in ALLOWED_PRODUCT_TYPES:
        # Still return structured contract findings after image parse, but fail fast on obvious abuse.
        pass
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    prof_path=None
    try:
        if output_profile is not None:
            p=UPLOAD_DIR/(uuid4().hex+"-profile.json")
            await _save_upload_limited(output_profile,p); prof_path=str(p)
        return evaluate_order_item(str(target),order_item_id,product_type,
                                   print_width_in,print_height_in,
                                   print_area_width_in,print_area_height_in,
                                   master_selected,prof_path,require_calibrated_profile)
    finally:
        target.unlink(missing_ok=True)
        if prof_path: Path(prof_path).unlink(missing_ok=True)

@app.post("/mockups/inspect")
async def mockup_inspect(file:UploadFile=File(...)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    try:
        result=inspect_mockup_asset(str(target))
        result["original_filename"]=file.filename
        return result
    finally:
        target.unlink(missing_ok=True)

@app.post("/jobs/analyze")
async def analyze_async(file:UploadFile=File(...),width_in:float=Form(...),height_in:float=Form(...),
                        choke_mm:float=Form(0.0),spread_mm:float=Form(0.0)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    def task():
        try: return inspect_master(str(target),width_in,height_in,choke_mm,spread_mm)
        finally: target.unlink(missing_ok=True)
    return {"job_id":queue.submit(task)}

@app.get("/jobs")
def list_jobs(limit:int=50):
    return {"jobs":queue.list_recent(limit)}

@app.get("/jobs/{job_id}")
def job_status(job_id:str):
    try: return queue.status(job_id)
    except KeyError: raise HTTPException(404,"job not found")

@app.delete("/jobs/{job_id}")
def cancel_job(job_id:str):
    try: return {"cancelled":queue.cancel(job_id)}
    except KeyError: raise HTTPException(404,"job not found")
