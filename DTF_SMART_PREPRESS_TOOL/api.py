from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI,UploadFile,File,Form,HTTPException,Request
from fastapi.responses import HTMLResponse
from pipeline import inspect_master
from jobs import PersistentJobQueue
from profile_loader import load_output_profile,calibration_readiness
from runtime_cleanup import cleanup_runtime
from settings import load_settings

settings=load_settings()
app=FastAPI(title="DTF Smart Prepress",version="0.5")
queue=PersistentJobQueue(max_workers=settings.max_workers,db_path="runtime_jobs.sqlite3")
UPLOAD_DIR=Path("runtime_uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
cleanup_runtime(str(UPLOAD_DIR),settings.runtime_ttl_seconds)

@app.middleware("http")
async def api_key_guard(request:Request,call_next):
    if settings.api_key and request.url.path not in ("/","/health"):
        if request.headers.get("x-api-key")!=settings.api_key:
            raise HTTPException(401,"invalid or missing X-API-Key")
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

@app.get("/health")
def health():
    return {"ok":True,"service":"DTF Smart Prepress","version":"0.5",
            "auth_enabled":bool(settings.api_key),"max_workers":settings.max_workers}

@app.get("/",response_class=HTMLResponse)
def home():
    return """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>DTF Smart Prepress</title>
<style>body{font-family:system-ui;background:#111;color:#eee;max-width:980px;margin:30px auto;padding:20px}
.card{background:#191919;padding:18px;border-radius:12px;margin-bottom:15px}input,button{margin:6px;padding:10px}
button{cursor:pointer}pre{white-space:pre-wrap;background:#090909;padding:16px;border-radius:8px;direction:ltr;text-align:left}
small{color:#aaa}</style></head><body>
<div class="card"><h1>DTF Smart Prepress</h1><p>محرك فحص مستقل — لا يغيّر الـReady-to-Print Master تلقائيًا.</p></div>
<div class="card"><form id="f"><input type="file" name="file" required><br>
<label>عرض الطباعة بالإنش <input type="number" step="0.01" name="width_in" required></label>
<label>ارتفاع الطباعة بالإنش <input type="number" step="0.01" name="height_in" required></label><br>
<label>Choke mm <input type="number" step="0.01" name="choke_mm" value="0"></label>
<label>Spread mm <input type="number" step="0.01" name="spread_mm" value="0"></label><br>
<label>API Key <input id="key" type="password" autocomplete="off"></label>
<button>Analyze / تحليل</button></form><small>إذا لم يتم ضبط API key في الخادم اتركه فارغًا.</small></div>
<pre id="out">Ready.</pre>
<script>f.onsubmit=async(e)=>{e.preventDefault();out.textContent="Analyzing...";
let h={};if(key.value)h["X-API-Key"]=key.value;
let r=await fetch("/analyze",{method:"POST",headers:h,body:new FormData(f)});let t=await r.text();
try{out.textContent=JSON.stringify(JSON.parse(t),null,2)}catch(_){out.textContent=t}}</script></body></html>"""

@app.post("/analyze")
async def analyze_upload(file:UploadFile=File(...),width_in:float=Form(...),height_in:float=Form(...),
                         choke_mm:float=Form(0.0),spread_mm:float=Form(0.0),
                         min_stroke_mm:float|None=Form(None),min_island_area_mm2:float|None=Form(None)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    try:
        return inspect_master(str(target),width_in,height_in,choke_mm,spread_mm,min_stroke_mm,min_island_area_mm2)
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
