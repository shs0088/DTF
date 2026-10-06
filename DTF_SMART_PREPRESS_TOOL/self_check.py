from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from importlib.metadata import version,PackageNotFoundError
import os,sqlite3,tempfile
from settings import load_settings

CORE_PACKAGES=("Pillow","numpy","fastapi","uvicorn","python-multipart")

def _pkg(name:str):
    try: return version(name)
    except PackageNotFoundError: return None

def run_self_check(base_dir:str|None=None)->Dict[str,Any]:
    base=Path(base_dir or Path(__file__).resolve().parent)
    settings=load_settings()
    packages={p:_pkg(p) for p in CORE_PACKAGES}
    missing=[p for p,v in packages.items() if v is None]
    dirs={}
    for name in ("runtime_uploads","runtime_candidates","runtime_calibration","runtime_masters","runtime_packages","runtime_reports"):
        p=base/name
        try:
            p.mkdir(exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=p,delete=True) as f:
                f.write(b"x"); f.flush()
            dirs[name]={"writable":True}
        except Exception as e:
            dirs[name]={"writable":False,"error":f"{type(e).__name__}: {e}"}
    sqlite_ok=True; sqlite_error=None
    try:
        db=base/"runtime_selfcheck.sqlite3"
        with sqlite3.connect(db) as c:
            c.execute("CREATE TABLE IF NOT EXISTS t(x INTEGER)")
            c.execute("INSERT INTO t(x) VALUES(1)")
        db.unlink(missing_ok=True)
    except Exception as e:
        sqlite_ok=False; sqlite_error=f"{type(e).__name__}: {e}"

    rembg_dir=(base/settings.rembg_model_dir).resolve() if not Path(settings.rembg_model_dir).is_absolute() else Path(settings.rembg_model_dir)
    models={name:(rembg_dir/name).is_file() for name in ("u2net.onnx","u2netp.onnx","isnet-general-use.onnx","isnet-anime.onnx","silueta.onnx")}
    realesrgan=Path(settings.realesrgan_bin).is_file() if settings.realesrgan_bin else False
    core_ready=not missing and sqlite_ok and all(x["writable"] for x in dirs.values())
    return {
      "core_ready":core_ready,
      "packages":packages,
      "missing_core_packages":missing,
      "runtime_directories":dirs,
      "sqlite":{"ok":sqlite_ok,"error":sqlite_error},
      "security":{"api_key_enabled":bool(settings.api_key),
                  "max_upload_bytes":settings.max_upload_bytes,
                  "max_workers":settings.max_workers,
                  "max_batch_files":settings.max_batch_files},
      "optional_ai":{"rembg_model_dir":str(rembg_dir),"models_present":models,
                     "realesrgan_configured":bool(settings.realesrgan_bin),
                     "realesrgan_executable_present":realesrgan},
      "network_required_for_runtime_ai":False
    }
