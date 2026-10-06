from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    api_key: str|None
    max_upload_bytes: int
    max_workers: int
    runtime_ttl_seconds: int

def load_settings()->Settings:
    key=os.getenv("DTF_PREPRESS_API_KEY") or None
    max_mb=max(1,int(os.getenv("DTF_PREPRESS_MAX_UPLOAD_MB","50")))
    workers=max(1,min(int(os.getenv("DTF_PREPRESS_MAX_WORKERS","2")),16))
    ttl=max(60,int(os.getenv("DTF_PREPRESS_RUNTIME_TTL_SECONDS","3600")))
    return Settings(key,max_mb*1024*1024,workers,ttl)
