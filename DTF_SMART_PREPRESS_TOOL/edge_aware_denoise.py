from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np

def _box_mean(x:np.ndarray,r:int)->np.ndarray:
    if r<=0: return x.astype(np.float32,copy=True)
    h,w=x.shape
    p=np.pad(x.astype(np.float32),((r,r),(r,r)),mode="reflect")
    s=np.pad(p,((1,0),(1,0)),mode="constant").cumsum(0).cumsum(1)
    k=2*r+1
    return (s[k:,k:]-s[:-k,k:]-s[k:,:-k]+s[:-k,:-k])/(k*k)

def guided_denoise_derivative(input_path:str,output_path:str,radius:int=4,epsilon:float=0.01,
                              max_megapixels:float=30.0)->Dict[str,Any]:
    """Edge-aware guided-filter derivative using luminance as guide; alpha is preserved exactly."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Guided denoise must create a derivative")
    im=Image.open(src).convert("RGBA")
    if im.width*im.height>max_megapixels*1_000_000:
        raise ValueError("image exceeds configured guided-filter memory limit")
    arr=np.asarray(im,dtype=np.float32)/255.0
    rgb=arr[:,:,:3]; alpha=(arr[:,:,3]*255+0.5).astype(np.uint8)
    guide=0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2]
    mean_i=_box_mean(guide,radius)
    corr_i=_box_mean(guide*guide,radius)
    var_i=np.maximum(corr_i-mean_i*mean_i,0.0)
    out=np.empty_like(rgb)
    for c in range(3):
        p=rgb[:,:,c]
        mean_p=_box_mean(p,radius)
        corr_ip=_box_mean(guide*p,radius)
        cov_ip=corr_ip-mean_i*mean_p
        a=cov_ip/(var_i+max(float(epsilon),1e-8))
        b=mean_p-a*mean_i
        mean_a=_box_mean(a,radius)
        mean_b=_box_mean(b,radius)
        out[:,:,c]=np.clip(mean_a*guide+mean_b,0,1)
    rgba=np.dstack([(out*255+0.5).astype(np.uint8),alpha])
    Image.fromarray(rgba,"RGBA").save(dst)
    return {"output":str(dst),"method":"guided_filter","guide":"luminance",
            "radius":radius,"epsilon":epsilon,"alpha_unchanged":True,
            "source_unchanged":True,
            "warning":"Edge-aware denoise is a candidate; fine texture can still be altered and must be compared against the source."}
