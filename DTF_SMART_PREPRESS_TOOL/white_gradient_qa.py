from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np

def analyze_white_support(source_path:str,white_mask_path:str,low_alpha_max:int=64)->Dict[str,Any]:
    alpha=np.asarray(Image.open(source_path).convert("RGBA"),dtype=np.float32)[:,:,3]/255.0
    white=np.asarray(Image.open(white_mask_path).convert("L"),dtype=np.float32)/255.0
    if white.shape!=alpha.shape:
        white=np.asarray(Image.fromarray((white*255).astype(np.uint8),"L").resize((alpha.shape[1],alpha.shape[0]),Image.Resampling.BILINEAR),dtype=np.float32)/255.0
    visible=alpha>0
    tail=(alpha>0)&(alpha<=low_alpha_max/255.0)
    unsupported=visible&(white<=0)
    tail_supported=tail&(white>0)
    isolated=0
    ys,xs=np.where(tail_supported)
    h,w=alpha.shape
    for y,x in zip(ys,xs):
        y0=max(0,y-1); y1=min(h,y+2); x0=max(0,x-1); x1=min(w,x+2)
        if (white[y0:y1,x0:x1]>0).sum()<=1: isolated+=1
    return {
      "visible_pixels":int(visible.sum()),
      "unsupported_visible_pixels":int(unsupported.sum()),
      "unsupported_visible_fraction":round(float(unsupported.sum()/max(int(visible.sum()),1)),6),
      "low_alpha_tail_pixels":int(tail.sum()),
      "tail_with_white_support":int(tail_supported.sum()),
      "tail_white_support_fraction":round(float(tail_supported.sum()/max(int(tail.sum()),1)),6),
      "isolated_tail_white_pixels":int(isolated),
      "note":"Low-alpha white support can create visible dots on dark garments; review gradient tails against the calibrated output condition."
    }
