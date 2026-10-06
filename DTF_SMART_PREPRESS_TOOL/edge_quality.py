from __future__ import annotations
from typing import Dict,Any
from PIL import Image,ImageFilter
import numpy as np

def _percentile(x:np.ndarray,q:float)->float:
    return float(np.percentile(x,q)) if x.size else 0.0

def _box_mean(x:np.ndarray,radius:int)->np.ndarray:
    r=max(0,int(radius))
    if r==0: return x.astype(np.float32,copy=True)
    k=2*r+1
    p=np.pad(x.astype(np.float32),((r,r),(r,r)),mode="reflect")
    s=np.pad(p,((1,0),(1,0)),mode="constant").cumsum(axis=0).cumsum(axis=1)
    return (s[k:,k:]-s[:-k,k:]-s[k:,:-k]+s[:-k,:-k])/(k*k)

def analyze_edge_rgb(path:str,neighborhood_radius:int=2)->Dict[str,Any]:
    """Compare semi-transparent edge RGB against nearby opaque foreground RGB.
    This is a contamination-risk metric, not a universal pass/fail threshold.
    """
    im=Image.open(path).convert("RGBA")
    arr=np.asarray(im,dtype=np.float32)
    rgb=arr[:,:,:3]/255.0; alpha=arr[:,:,3]/255.0
    semi=(alpha>0)&(alpha<1)
    opaque=alpha>=0.98
    size=max(3,neighborhood_radius*2+1)
    if size%2==0: size+=1
    opaque_img=Image.fromarray((opaque.astype(np.uint8)*255),"L")
    opaque_local=np.asarray(opaque_img.filter(ImageFilter.MaxFilter(size)),dtype=np.uint8)>0

    denom=_box_mean(opaque.astype(np.float32),neighborhood_radius)
    means=np.stack([_box_mean(rgb[:,:,c]*opaque,neighborhood_radius) for c in range(3)],axis=2)
    means=means/np.maximum(denom[:,:,None],1e-6)
    valid=semi & opaque_local & (denom>1e-6)
    diff=np.sqrt(np.sum((rgb-means)**2,axis=2))[valid]
    lum=0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2]
    return {
      "edge_pixels_evaluated":int(valid.sum()),
      "rgb_deviation_mean":round(float(diff.mean()),6) if diff.size else 0.0,
      "rgb_deviation_p95":round(_percentile(diff,95),6),
      "extreme_light_fraction":round(float(((valid)&(lum>0.95)).sum()/max(int(valid.sum()),1)),6),
      "extreme_dark_fraction":round(float(((valid)&(lum<0.05)).sum()/max(int(valid.sum()),1)),6),
      "method":"semi-transparent RGB vs nearby opaque foreground mean",
      "note":"Large deviation can be legitimate colored antialiasing; review with multi-background composites."
    }
