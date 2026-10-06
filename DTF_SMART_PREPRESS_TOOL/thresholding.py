from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np

def otsu_threshold(values:np.ndarray)->int:
    hist=np.bincount(values.astype(np.uint8).ravel(),minlength=256).astype(np.float64)
    total=hist.sum()
    if total==0: return 0
    prob=hist/total; omega=np.cumsum(prob); mu=np.cumsum(prob*np.arange(256)); mt=mu[-1]
    denom=omega*(1-omega)
    score=np.where(denom>0,(mt*omega-mu)**2/denom,-1)
    return int(np.argmax(score))

def threshold_alpha_candidate(input_path:str,output_path:str,method:str="otsu",
                              threshold:int|None=None)->Dict[str,Any]:
    """Creates a candidate binary-alpha derivative. Never used automatically on soft transparency."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Thresholding must create a derivative")
    im=Image.open(src).convert("RGBA"); a=np.asarray(im.getchannel("A"),dtype=np.uint8)
    if method=="otsu": t=otsu_threshold(a)
    elif method=="fixed":
        if threshold is None or not 0<=threshold<=255: raise ValueError("fixed threshold requires 0..255")
        t=int(threshold)
    else: raise ValueError("method must be otsu or fixed")
    binary=np.where(a>=t,255,0).astype(np.uint8)
    out=im.copy(); out.putalpha(Image.fromarray(binary,"L")); out.save(dst)
    changed=int((binary!=a).sum())
    return {"output":str(dst),"method":method,"threshold":t,"changed_alpha_pixels":changed,
            "warning":"Binary thresholding can destroy antialiasing, hair, smoke, glass and intentional soft alpha."}
