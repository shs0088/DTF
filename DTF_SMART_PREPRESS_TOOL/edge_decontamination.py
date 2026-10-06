from pathlib import Path
from typing import Dict, Any, Tuple
from PIL import Image
import numpy as np

def unmatte_known_background(input_path: str, output_path: str,
                             background_rgb: Tuple[int,int,int],
                             min_alpha: int=8) -> Dict[str,Any]:
    """Estimate foreground RGB from C = aF + (1-a)B when B is actually known.
    Alpha is preserved. This must not be used with a guessed background as an automatic fix.
    """
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Decontaminated derivative must not overwrite source")
    im=np.asarray(Image.open(src).convert("RGBA"),dtype=np.float32)
    rgb=im[:,:,:3]/255.0; a=im[:,:,3:4]/255.0
    b=np.array(background_rgb,dtype=np.float32).reshape(1,1,3)/255.0
    valid=(a[:,:,0]>=min_alpha/255.0)&(a[:,:,0]<1.0)
    safe=np.maximum(a,1e-6)
    f=(rgb-(1.0-a)*b)/safe
    out=im.copy()
    corrected=np.clip(f*255.0,0,255)
    out[:,:,:3][valid]=corrected[valid]
    Image.fromarray(np.clip(out,0,255).astype(np.uint8),"RGBA").save(dst)
    return {"output":str(dst),"background_rgb":list(background_rgb),"min_alpha":min_alpha,
            "corrected_pixels":int(valid.sum()),"alpha_unchanged":True,
            "warning":"Use only when the original matte/background color is known with confidence."}
