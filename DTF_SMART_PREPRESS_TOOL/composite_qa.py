from typing import Dict, Any
from PIL import Image
import numpy as np

BACKGROUNDS={
 "white":(255,255,255),"black":(0,0,0),"red":(220,30,30),"blue":(25,80,220)
}

def composite_stats(path: str) -> Dict[str,Any]:
    fg=Image.open(path).convert("RGBA")
    results={}
    for name,color in BACKGROUNDS.items():
        bg=Image.new("RGBA",fg.size,color+(255,))
        comp=Image.alpha_composite(bg,fg).convert("RGB")
        a=np.asarray(comp,dtype=np.float32)/255.0
        lum=0.2126*a[:,:,0]+0.7152*a[:,:,1]+0.0722*a[:,:,2]
        results[name]={"mean_luminance":round(float(lum.mean()),6),
                       "luminance_std":round(float(lum.std()),6)}
    return {"backgrounds":results,
            "note":"Composite statistics support review; they do not by themselves prove halo contamination."}
