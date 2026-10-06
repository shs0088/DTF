from dataclasses import dataclass, asdict
from typing import Dict, Any, Tuple
from PIL import Image
import numpy as np

@dataclass
class PixelAnalysis:
    width_px: int
    height_px: int
    has_alpha: bool
    transparent_ratio: float
    semi_transparent_ratio: float
    low_alpha_ratio: float
    opaque_ratio: float
    content_bbox: Tuple[int,int,int,int] | None
    edge_rgb_light_risk: float
    edge_rgb_dark_risk: float
    min_run_px: int | None

def _ratio(mask: np.ndarray) -> float:
    return float(mask.mean()) if mask.size else 0.0

def _source_has_alpha(im: Image.Image) -> bool:
    return ("A" in im.getbands()) or ("transparency" in im.info)

def analyze_pixels(path: str, low_alpha_max: int = 24) -> Dict[str, Any]:
    src=Image.open(path)
    has_alpha=_source_has_alpha(src)
    im=src.convert("RGBA")
    a=np.asarray(im, dtype=np.uint8)
    rgb=a[:,:,:3].astype(np.float32)
    alpha=a[:,:,3]
    visible=alpha>0
    semi=(alpha>0)&(alpha<255)
    low=(alpha>0)&(alpha<=low_alpha_max)
    opaque=alpha==255
    ys,xs=np.where(visible)
    bbox=None if len(xs)==0 else (int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))

    # Screening signals only: extreme RGB on semi-transparent edges can be legitimate artwork.
    lum=(0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2])/255.0
    edge_count=max(int(semi.sum()),1)
    light=float(((semi)&(lum>0.92)).sum()/edge_count)
    dark=float(((semi)&(lum<0.08)).sum()/edge_count)

    runs=[]
    for m in (visible, visible.T):
        for row in m:
            idx=np.flatnonzero(row)
            if idx.size:
                cuts=np.where(np.diff(idx)>1)[0]
                starts=np.r_[0,cuts+1]; ends=np.r_[cuts,idx.size-1]
                runs.extend((idx[ends]-idx[starts]+1).tolist())
    min_run=min(runs) if runs else None

    return asdict(PixelAnalysis(
        im.width,im.height,has_alpha,_ratio(alpha==0),_ratio(semi),_ratio(low),
        _ratio(opaque),bbox,light,dark,min_run
    ))
