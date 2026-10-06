from pathlib import Path
from typing import Dict, Any
from PIL import Image
import numpy as np

_BAYER4=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]],dtype=np.float32)

def ordered_bayer_preview(input_path: str, output_path: str, channel: str="luminance") -> Dict[str,Any]:
    """Diagnostic ordered-screen preview only; not printer-calibrated RIP screening."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Halftone preview must not overwrite source")
    rgba=np.asarray(Image.open(src).convert("RGBA"),dtype=np.uint8)
    rgb=rgba[:,:,:3].astype(np.float32)/255.0
    alpha=rgba[:,:,3]
    if channel=="luminance":
        v=0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2]
    elif channel=="alpha":
        v=alpha.astype(np.float32)/255.0
    else:
        raise ValueError("channel must be luminance or alpha")
    h,w=v.shape
    threshold=(np.tile(_BAYER4,(int(np.ceil(h/4)),int(np.ceil(w/4))))[:h,:w]+0.5)/16.0
    dots=(v>=threshold).astype(np.uint8)*255
    Image.fromarray(dots,"L").save(dst)
    return {"output":str(dst),"family":"ordered","matrix":"Bayer4x4","channel":channel,
            "warning":"Diagnostic preview only; no LPI/angle/minimum-dot/TVI calibration is implied."}
