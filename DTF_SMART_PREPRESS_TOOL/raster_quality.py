from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np,math

def _load_gray(path:str,max_pixels:int=2_000_000):
    im=Image.open(path).convert("L")
    scale=1.0
    if im.width*im.height>max_pixels:
        scale=math.sqrt(max_pixels/(im.width*im.height))
        im=im.resize((max(1,int(im.width*scale)),max(1,int(im.height*scale))),Image.Resampling.BILINEAR)
    return np.asarray(im,dtype=np.float32)/255.0,scale

def analyze_raster_quality(path:str,max_pixels:int=2_000_000)->Dict[str,Any]:
    g,scale=_load_gray(path,max_pixels)
    if g.shape[0]<3 or g.shape[1]<3:
        return {"analysis_scale":scale,"note":"Image too small for raster-quality diagnostics."}
    center=g[1:-1,1:-1]
    lap=(-4*center+g[:-2,1:-1]+g[2:,1:-1]+g[1:-1,:-2]+g[1:-1,2:])
    gx=np.diff(g,axis=1); gy=np.diff(g,axis=0)
    edge=np.concatenate([np.abs(gx).ravel(),np.abs(gy).ravel()])
    # High-frequency residual against 3x3 local mean, used only as a noise/texture proxy.
    p=np.pad(g,1,mode="reflect")
    mean=sum(p[y:y+g.shape[0],x:x+g.shape[1]] for y in range(3) for x in range(3))/9.0
    resid=g-mean
    noise_proxy=float(np.median(np.abs(resid-np.median(resid)))*1.4826)

    # JPEG-style 8x8 boundary discontinuity ratio. Useful even when a JPEG was re-saved to PNG.
    v_all=np.abs(np.diff(g,axis=1))
    h_all=np.abs(np.diff(g,axis=0))
    v_idx=[i-1 for i in range(8,g.shape[1],8)]
    h_idx=[i-1 for i in range(8,g.shape[0],8)]
    vb=float(v_all[:,v_idx].mean()) if v_idx else 0.0
    hb=float(h_all[h_idx,:].mean()) if h_idx else 0.0
    interior=float((v_all.mean()+h_all.mean())/2.0)
    blockiness=(vb+hb)/2.0/max(interior,1e-6)

    return {
      "analysis_scale":round(float(scale),6),
      "laplacian_variance":round(float(lap.var()),8),
      "edge_gradient_mean":round(float(edge.mean()),8),
      "edge_gradient_p95":round(float(np.percentile(edge,95)),8),
      "noise_texture_proxy":round(noise_proxy,8),
      "block_boundary_ratio":round(float(blockiness),6),
      "note":"No-reference diagnostics only. High-frequency texture may be intentional; no universal DTF pass/fail threshold is applied."
    }
