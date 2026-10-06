from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse
from pipeline import inspect_master
from jobs import BoundedJobQueue

app=FastAPI(title="DTF Smart Prepress",version="0.4")
queue=BoundedJobQueue(max_workers=2)
UPLOAD_DIR=Path("runtime_uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES=50*1024*1024

async def _save_upload_limited(file: UploadFile, target: Path) -> int:
    total=0
    try:
        with target.open("wb") as f:
            while True:
                chunk=await file.read(1024*1024)
                if not chunk: break
                total += len(chunk)
                if total>MAX_UPLOAD_BYTES:
                    raise HTTPException(413,"upload exceeds configured byte limit")
                f.write(chunk)
        return total
    except Exception:
        target.unlink(missing_ok=True)
        raise

@app.get("/health")
def health(): return {"ok":True,"service":"DTF Smart Prepress"}

@app.get("/",response_class=HTMLResponse)
def home():
    return """<!doctype html><html><head><meta charset="utf-8"><title>DTF Smart Prepress</title>
<style>body{font-family:system-ui;background:#111;color:#eee;max-width:900px;margin:40px auto;padding:20px}
input,button{margin:6px;padding:10px}button{cursor:pointer}pre{white-space:pre-wrap;background:#1b1b1b;padding:16px;border-radius:8px}</style></head>
<body><h1>DTF Smart Prepress</h1><p>Standalone preflight build — protected storefront is not modified.</p>
<form id="f"><input type="file" name="file" required><br>
<label>Print width (in) <input type="number" step="0.01" name="width_in" required></label>
<label>Print height (in) <input type="number" step="0.01" name="height_in" required></label><br>
<label>Choke (mm) <input type="number" step="0.01" name="choke_mm" value="0"></label>
<label>Spread (mm) <input type="number" step="0.01" name="spread_mm" value="0"></label>
<button>Analyze</button></form><pre id="out">Ready.</pre>
<script>f.onsubmit=async(e)=>{e.preventDefault();out.textContent="Analyzing...";
let r=await fetch("/analyze",{method:"POST",body:new FormData(f)});let t=await r.text();
try{out.textContent=JSON.stringify(JSON.parse(t),null,2)}catch(_){out.textContent=t}}</script></body></html>"""

@app.post("/analyze")
async def analyze_upload(file: UploadFile=File(...), width_in: float=Form(...), height_in: float=Form(...),
                         choke_mm: float=Form(0.0), spread_mm: float=Form(0.0)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    try:
        return inspect_master(str(target),width_in,height_in,choke_mm,spread_mm)
    finally:
        target.unlink(missing_ok=True)

@app.post("/jobs/analyze")
async def analyze_async(file: UploadFile=File(...), width_in: float=Form(...), height_in: float=Form(...)):
    target=UPLOAD_DIR/(uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    await _save_upload_limited(file,target)
    def task():
        try: return inspect_master(str(target),width_in,height_in)
        finally: target.unlink(missing_ok=True)
    return {"job_id":queue.submit(task)}

@app.get("/jobs/{job_id}")
def job_status(job_id:str):
    try: return queue.status(job_id)
    except KeyError: raise HTTPException(404,"job not found")

@app.delete("/jobs/{job_id}")
def cancel_job(job_id:str):
    try: return {"cancelled":queue.cancel(job_id)}
    except KeyError: raise HTTPException(404,"job not found")
