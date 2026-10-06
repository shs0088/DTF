from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np,os

_OFFLINE_MODEL_FILES={
  "u2net":"u2net.onnx",
  "u2netp":"u2netp.onnx",
  "isnet-general-use":"isnet-general-use.onnx",
  "isnet-anime":"isnet-anime.onnx",
  "silueta":"silueta.onnx"
}

def inspect_trimap(path:str,background_max:int=24,foreground_min:int=250)->Dict[str,Any]:
    a=np.asarray(Image.open(path).convert("RGBA"))[:,:,3]
    bg=a<=background_max; fg=a>=foreground_min; unknown=~(bg|fg)
    return {"background_pixels":int(bg.sum()),"foreground_pixels":int(fg.sum()),
            "unknown_pixels":int(unknown.sum()),"background_max":background_max,
            "foreground_min":foreground_min,
            "note":"Unknown-region preservation is intentional; this is not a binary segmentation score."}

def rembg_candidate(input_path:str,output_path:str,model:str="u2net",
                    model_cache_dir:str="models/rembg")->Dict[str,Any]:
    """Offline-first AI matte candidate. Refuses to run if the model is not already local."""
    if model not in _OFFLINE_MODEL_FILES:
        raise ValueError(f"offline model not allowlisted: {model}")
    cache=Path(model_cache_dir).resolve()
    model_file=cache/_OFFLINE_MODEL_FILES[model]
    if not model_file.is_file():
        raise FileNotFoundError(f"offline model missing: {model_file}")
    os.environ["U2NET_HOME"]=str(cache)
    try:
        import rembg
    except ImportError as e:
        raise RuntimeError("AI backend not installed; install requirements-ai.txt") from e
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("AI matte candidate must not overwrite source")
    session=rembg.new_session(model)
    result=rembg.remove(Path(src).read_bytes(),session=session)
    Path(dst).write_bytes(result)
    return {"output":str(dst),"backend":"rembg","model":model,
            "model_file":str(model_file),"network_required":False,"source_unchanged":True,
            "warning":"AI matte is a candidate and must pass edge, topology and multi-background QA."}
