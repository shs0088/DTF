from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np

def analyze_alpha_quality(path:str,low_max:int=24)->Dict[str,Any]:
    a=np.asarray(Image.open(path).convert("RGBA"),dtype=np.float32)[:,:,3]/255.0
    if a.size==0: return {}
    gx=np.abs(np.diff(a,axis=1)); gy=np.abs(np.diff(a,axis=0))
    grad=np.concatenate([gx.ravel(),gy.ravel()])
    semi=(a>0)&(a<1); low=(a>0)&(a<=low_max/255.0)
    isolated_low=0
    h,w=a.shape
    ys,xs=np.where(low)
    for y,x in zip(ys,xs):
        y0=max(0,y-1); y1=min(h,y+2); x0=max(0,x-1); x1=min(w,x+2)
        if ((a[y0:y1,x0:x1]>low_max/255.0).sum()==0):
            isolated_low+=1
    return {
      "semi_transparent_pixels":int(semi.sum()),
      "low_alpha_pixels":int(low.sum()),
      "isolated_low_alpha_pixels":int(isolated_low),
      "isolated_low_alpha_fraction":round(isolated_low/max(int(low.sum()),1),6),
      "alpha_gradient_mean":round(float(grad.mean()),6),
      "alpha_gradient_p95":round(float(np.percentile(grad,95)),6),
      "note":"These are alpha-structure diagnostics. Soft transitions may be intentional."
    }
