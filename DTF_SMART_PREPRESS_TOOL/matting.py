from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np

def inspect_trimap(path:str,background_max:int=24,foreground_min:int=250)->Dict[str,Any]:
    a=np.asarray(Image.open(path).convert("RGBA"))[:,:,3]
    bg=a<=background_max; fg=a>=foreground_min; unknown=~(bg|fg)
    return {"background_pixels":int(bg.sum()),"foreground_pixels":int(fg.sum()),
            "unknown_pixels":int(unknown.sum()),"background_max":background_max,
            "foreground_min":foreground_min,
            "note":"Unknown-region preservation is intentional; this is not a binary segmentation score."}

def rembg_candidate(input_path:str,output_path:str,model:str="u2net")->Dict[str,Any]:
    """Optional AI candidate backend. Requires requirements-ai.txt and may download model weights."""
    try:
        import rembg
    except ImportError as e:
        raise RuntimeError("AI backend not installed; install requirements-ai.txt") from e
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("AI matte candidate must not overwrite source")
    session=rembg.new_session(model)
    data=Path(src).read_bytes()
    result=rembg.remove(data,session=session)
    Path(dst).write_bytes(result)
    return {"output":str(dst),"backend":"rembg","model":model,"source_unchanged":True,
            "warning":"AI matte is a candidate and must pass edge, topology and multi-background QA."}
