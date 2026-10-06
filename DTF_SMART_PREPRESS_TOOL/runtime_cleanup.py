from pathlib import Path
from time import time
from typing import Dict,Any

def cleanup_runtime(directory:str="runtime_uploads",older_than_seconds:int=3600)->Dict[str,Any]:
    root=Path(directory)
    if not root.exists(): return {"deleted":0,"bytes_freed":0}
    cutoff=time()-max(0,older_than_seconds)
    deleted=0; freed=0
    for p in root.iterdir():
        if not p.is_file(): continue
        try:
            st=p.stat()
            if st.st_mtime<cutoff:
                freed += st.st_size
                p.unlink()
                deleted += 1
        except FileNotFoundError:
            pass
    return {"deleted":deleted,"bytes_freed":freed}
