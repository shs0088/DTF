from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np,math

SQRT2=2**0.5

def _chamfer_distance(mask:np.ndarray)->np.ndarray:
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
            ys=slice(max(0,dy),h+min(0,dy)); xs=slice(max(0,dx),w+min(0,dx))
            ysrc=slice(max(0,-dy),h-min(0,dy)); xsrc=slice(max(0,-dx),w-min(0,dx))
            shifted[ys,xs]=d[ysrc,xsrc]
            m &= d>=shifted
    return m & (d>0)

def _analysis_mask(path:str,alpha_threshold:int,max_analysis_pixels:int):
    im=Image.open(path).convert("RGBA")
    alpha=im.getchannel("A")
    original=(im.width,im.height)
    pixels=im.width*im.height
    scale=1.0
    if pixels>max_analysis_pixels:
        scale=math.sqrt(max_analysis_pixels/pixels)
        nw=max(1,int(round(im.width*scale))); nh=max(1,int(round(im.height*scale)))
        alpha=alpha.resize((nw,nh),Image.Resampling.NEAREST)
    a=np.asarray(alpha)
    return a>=alpha_threshold,original,scale

def analyze_feature_width(path:str,alpha_threshold:int=128,effective_dpi:float|None=None,
                          max_analysis_pixels:int=4_000_000)->Dict[str,Any]:
    mask,original,scale=_analysis_mask(path,alpha_threshold,max_analysis_pixels)
    if not mask.any():
        return {"alpha_threshold":alpha_threshold,"skeleton_proxy_points":0,"width_px":None,
                "analysis_scale":scale,"original_size_px":list(original)}
    d=_chamfer_distance(mask)
    sk=_local_maxima(d,mask)
    widths=(2*d[sk]/scale).astype(np.float32)
    if widths.size==0:
        widths=np.array([2*d[mask].max()/scale],dtype=np.float32)
    q={str(p):round(float(np.percentile(widths,p)),4) for p in (5,10,25,50,75,90,95)}
    result={
      "alpha_threshold":alpha_threshold,
      "skeleton_proxy_points":int(widths.size),
      "width_px":{"min":round(float(widths.min()),4),"max":round(float(widths.max()),4),"percentiles":q},
      "analysis_scale":round(float(scale),6),
      "original_size_px":list(original),
      "method":"8-neighbour chamfer distance + local-maxima skeleton proxy",
      "note":"Approximate local feature width. Large inputs may be analyzed on a scaled mask, then reported in original-pixel units."
    }
    if effective_dpi:
        mm=25.4/effective_dpi
        result["width_mm"]={
          "min":round(float(widths.min()*mm),6),
          "p10":round(float(np.percentile(widths,10)*mm),6),
          "median":round(float(np.percentile(widths,50)*mm),6)
        }
    return result
