from __future__ import annotations
from typing import Dict,Any
from PIL import Image
import numpy as np

def classify_background(path:str,tolerance:float=24.0)->Dict[str,Any]:
    im=Image.open(path)
    source_has_alpha=("A" in im.getbands()) or ("transparency" in im.info)
    rgba=np.asarray(im.convert("RGBA"),dtype=np.uint8)
    rgb=rgba[:,:,:3].astype(np.float32); alpha=rgba[:,:,3]
    h,w=alpha.shape
    border=np.concatenate([rgb[0,:,:],rgb[-1,:,:],rgb[:,0,:],rgb[:,-1,:]],axis=0)
    key=np.median(border,axis=0)
    dist=np.sqrt(np.sum((border-key)**2,axis=1))
    uniform_fraction=float((dist<=tolerance).mean()) if dist.size else 0.0
    transparent_fraction=float((alpha==0).mean())
    semi_fraction=float(((alpha>0)&(alpha<255)).mean())

    if source_has_alpha and transparent_fraction>0.001:
        mode="existing_alpha"
        reason="Source already contains meaningful transparent pixels; inspect/refine existing alpha before rerunning removal."
    elif uniform_fraction>=0.92:
        mode="border_connected_color_key_candidate"
        reason="Canvas border is highly uniform; border-connected color-key removal is a conservative first candidate."
    else:
        mode="semantic_or_matting_candidate"
        reason="Border is not uniform enough for confident color-key removal; semantic segmentation/matting may be more appropriate."
    return {
      "recommended_mode":mode,
      "reason":reason,
      "source_has_alpha":source_has_alpha,
      "transparent_fraction":round(transparent_fraction,6),
      "semi_transparent_fraction":round(semi_fraction,6),
      "estimated_border_rgb":[int(round(x)) for x in key],
      "border_uniform_fraction":round(uniform_fraction,6),
      "tolerance_rgb_distance":float(tolerance),
      "automatic_removal":False
    }
