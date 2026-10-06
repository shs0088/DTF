from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np

SQRT2=2**0.5

def _chamfer_distance(mask:np.ndarray)->np.ndarray:
    """Approximate Euclidean distance to background with 8-neighbour chamfer passes."""
    h,w=mask.shape
    inf=float(h+w+10)
    d=np.where(mask,inf,0.0).astype(np.float32)
    for y in range(h):
        for x in range(w):
            if not mask[y,x]: continue
            best=d[y,x]
            if y>0: best=min(best,d[y-1,x]+1)
            if x>0: best=min(best,d[y,x-1]+1)
            if y>0 and x>0: best=min(best,d[y-1,x-1]+SQRT2)
            if y>0 and x+1<w: best=min(best,d[y-1,x+1]+SQRT2)
            d[y,x]=best
    for y in range(h-1,-1,-1):
        for x in range(w-1,-1,-1):
            if not mask[y,x]: continue
            best=d[y,x]
            if y+1<h: best=min(best,d[y+1,x]+1)
            if x+1<w: best=min(best,d[y,x+1]+1)
            if y+1<h and x+1<w: best=min(best,d[y+1,x+1]+SQRT2)
            if y+1<h and x>0: best=min(best,d[y+1,x-1]+SQRT2)
            d[y,x]=best
    return d

def _local_maxima(d:np.ndarray,mask:np.ndarray)->np.ndarray:
    h,w=d.shape
    m=mask.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dx==0 and dy==0: continue
            shifted=np.full_like(d,-1)
            ys=slice(max(0,dy),h+min(0,dy))
            xs=slice(max(0,dx),w+min(0,dx))
            ysrc=slice(max(0,-dy),h-min(0,dy))
            xsrc=slice(max(0,-dx),w-min(0,dx))
            shifted[ys,xs]=d[ysrc,xsrc]
            m &= d>=shifted
    return m & (d>0)

def analyze_feature_width(path:str,alpha_threshold:int=128,effective_dpi:float|None=None)->Dict[str,Any]:
    alpha=np.asarray(Image.open(path).convert("RGBA"))[:,:,3]
    mask=alpha>=alpha_threshold
    if not mask.any():
        return {"alpha_threshold":alpha_threshold,"skeleton_proxy_points":0,"width_px":None}
    d=_chamfer_distance(mask)
    sk=_local_maxima(d,mask)
    widths=(2*d[sk]).astype(np.float32)
    if widths.size==0:
        widths=np.array([2*d[mask].max()],dtype=np.float32)
    q={str(p):round(float(np.percentile(widths,p)),4) for p in (5,10,25,50,75,90,95)}
    result={
      "alpha_threshold":alpha_threshold,
      "skeleton_proxy_points":int(widths.size),
      "width_px":{"min":round(float(widths.min()),4),"max":round(float(widths.max()),4),"percentiles":q},
      "method":"8-neighbour chamfer distance + local-maxima skeleton proxy",
      "note":"Approximate local feature width; use printed calibration for actual survivability thresholds."
    }
    if effective_dpi:
        scale=25.4/effective_dpi
        result["width_mm"]={
          "min":round(float(widths.min()*scale),6),
          "p10":round(float(np.percentile(widths,10)*scale),6),
          "median":round(float(np.percentile(widths,50)*scale),6)
        }
    return result
