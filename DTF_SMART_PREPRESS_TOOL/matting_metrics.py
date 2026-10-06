from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np

def _alpha(path:str,size:tuple[int,int]|None=None):
    im=Image.open(path)
    if "A" in im.getbands():
        a=im.convert("RGBA").getchannel("A")
    else:
        a=im.convert("L")
    resized=False
    if size and a.size!=size:
        a=a.resize(size,Image.Resampling.BILINEAR); resized=True
    return np.asarray(a,dtype=np.float32)/255.0,resized,a.size

def compare_alpha_mattes(reference_path:str,candidate_path:str)->Dict[str,Any]:
    ref,_,size=_alpha(reference_path)
    cand,resized,_=_alpha(candidate_path,size)
    diff=np.abs(ref-cand)
    mse=float(np.mean((ref-cand)**2))
    sad_sum=float(diff.sum())
    gx_ref=np.diff(ref,axis=1); gx_c=np.diff(cand,axis=1)
    gy_ref=np.diff(ref,axis=0); gy_c=np.diff(cand,axis=0)
    grad_mae=float((np.abs(gx_ref-gx_c).mean()+np.abs(gy_ref-gy_c).mean())/2.0)
    edge=(ref>0.05)&(ref<0.95)
    edge_mae=float(diff[edge].mean()) if edge.any() else 0.0
    ious=[]
    for t in (0.1,0.25,0.5,0.75,0.9):
        r=ref>=t; c=cand>=t
        union=(r|c).sum()
        ious.append(1.0 if union==0 else float((r&c).sum()/union))
    return {
      "reference_size_px":list(size),
      "candidate_resized_for_comparison":resized,
      "sad_sum":round(sad_sum,6),
      "sad_mean":round(float(diff.mean()),8),
      "mse":round(mse,8),
      "gradient_mae":round(grad_mae,8),
      "reference_soft_edge_pixels":int(edge.sum()),
      "soft_edge_mae":round(edge_mae,8),
      "threshold_iou_mean":round(float(np.mean(ious)),8),
      "threshold_ious":{str(t):round(v,8) for t,v in zip((0.1,0.25,0.5,0.75,0.9),ious)},
      "note":"Reference-based alpha metrics. threshold_iou_mean is not the official alpha-matting connectivity metric."
    }
