from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    api_key: str|None
    max_upload_bytes: int
    max_workers: int
    runtime_ttl_seconds: int
    rembg_model_dir: str
    realesrgan_bin: str|None
    max_batch_files: int

def load_settings()->Settings:
    key=os.getenv("DTF_PREPRESS_API_KEY") or None
    max_mb=max(1,int(os.getenv("DTF_PREPRESS_MAX_UPLOAD_MB","50")))
    workers=max(1,min(int(os.getenv("DTF_PREPRESS_MAX_WORKERS","2")),16))
    ttl=max(60,int(os.getenv("DTF_PREPRESS_RUNTIME_TTL_SECONDS","3600")))
    rembg_dir=os.getenv("DTF_REMBG_MODEL_DIR","models/rembg")
    realesrgan=os.getenv("DTF_REALESRGAN_BIN") or None
    max_batch=max(1,min(int(os.getenv("DTF_PREPRESS_MAX_BATCH_FILES","10")),100))
    return Settings(key,max_mb*1024*1024,workers,ttl,rembg_dir,realesrgan,max_batch)
