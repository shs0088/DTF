from __future__ import annotations
from hashlib import sha256
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any
import json

def sha256_file(path: str, chunk_size: int=1024*1024) -> str:
    h=sha256()
    with open(path,"rb") as f:
        while True:
            b=f.read(chunk_size)
            if not b: break
            h.update(b)
    return h.hexdigest()

def asset_record(path: str, role: str, parent_sha256: str|None=None,
                 operation: str|None=None, parameters: Dict[str,Any]|None=None) -> Dict[str,Any]:
    p=Path(path)
    return {
        "role":role,
        "path":str(p),
        "sha256":sha256_file(str(p)),
        "bytes":p.stat().st_size,
        "parent_sha256":parent_sha256,
        "operation":operation,
        "parameters":parameters or {},
        "created_utc":datetime.now(timezone.utc).isoformat()
    }

def write_manifest(path: str, record: Dict[str,Any]) -> str:
    Path(path).write_text(json.dumps(record,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    return path
