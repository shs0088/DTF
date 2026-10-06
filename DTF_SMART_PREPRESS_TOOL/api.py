from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pipeline import inspect_master
from jobs import BoundedJobQueue

app=FastAPI(title="DTF Smart Prepress",version="0.3")
queue=BoundedJobQueue(max_workers=2)
UPLOAD_DIR=Path("runtime_uploads"); UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/health")
def health(): return {"ok":True,"service":"DTF Smart Prepress"}

@app.post("/analyze")
async def analyze_upload(file: UploadFile=File(...), width_in: float=Form(...), height_in: float=Form(...),
                         choke_mm: float=Form(0.0), spread_mm: float=Form(0.0)):
    suffix=Path(file.filename or "upload.bin").suffix.lower()
    target=UPLOAD_DIR/(Path(file.filename or "upload").stem+"-"+__import__("uuid").uuid4().hex+suffix)
    data=await file.read()
    target.write_bytes(data)
    try:
        return inspect_master(str(target),width_in,height_in,choke_mm,spread_mm)
    finally:
        target.unlink(missing_ok=True)

@app.post("/jobs/analyze")
async def analyze_async(file: UploadFile=File(...), width_in: float=Form(...), height_in: float=Form(...)):
    target=UPLOAD_DIR/(__import__("uuid").uuid4().hex+Path(file.filename or ".bin").suffix.lower())
    target.write_bytes(await file.read())
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
