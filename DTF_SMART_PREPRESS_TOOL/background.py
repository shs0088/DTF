from collections import deque
from pathlib import Path
from typing import Dict, Any, Tuple
from PIL import Image
import numpy as np

def _rgb_distance(rgb: np.ndarray, key: np.ndarray) -> np.ndarray:
    d=rgb.astype(np.float32)-key.astype(np.float32)
    return np.sqrt((d*d).sum(axis=2))

def estimate_corner_background(path: str) -> Tuple[int,int,int]:
    im=np.asarray(Image.open(path).convert("RGB"),dtype=np.uint8)
    h,w,_=im.shape
    samples=np.vstack([im[0,0],im[0,w-1],im[h-1,0],im[h-1,w-1]])
    return tuple(int(x) for x in np.median(samples,axis=0))

def border_connected_color_key(input_path: str, output_path: str, tolerance: float=24.0,
                               key_rgb: Tuple[int,int,int] | None=None) -> Dict[str,Any]:
    """Remove only key-like pixels connected to the canvas border.
    This avoids global deletion of legitimate near-background colors inside artwork.
    Output is always a derivative.
    """
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Background-removal candidate must not overwrite source")
    im=Image.open(src).convert("RGBA")
    a=np.asarray(im).copy(); rgb=a[:,:,:3]
    key=np.array(key_rgb or estimate_corner_background(input_path),dtype=np.uint8)
    candidate=_rgb_distance(rgb,key)<=float(tolerance)
    h,w=candidate.shape
    connected=np.zeros_like(candidate,dtype=bool); q=deque()
    for x in range(w):
        for y in (0,h-1):
            if candidate[y,x] and not connected[y,x]: connected[y,x]=1; q.append((y,x))
    for y in range(h):
        for x in (0,w-1):
            if candidate[y,x] and not connected[y,x]: connected[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and candidate[ny,nx] and not connected[ny,nx]:
                connected[ny,nx]=1; q.append((ny,nx))
    before=a[:,:,3].copy()
    a[connected,3]=0
    Image.fromarray(a,"RGBA").save(dst)
    return {"output":str(dst),"mode":"border_connected_color_key","key_rgb":key.tolist(),
            "tolerance":float(tolerance),"pixels_removed":int(connected.sum()),
            "existing_alpha_preserved_outside_removed_background":bool(np.all(a[:,:,3][~connected]==before[~connected])),
            "source_unchanged":True}

def alpha_zones(path: str, low_max: int=24, opaque_min: int=250) -> Dict[str,Any]:
    a=np.asarray(Image.open(path).convert("RGBA"))[:,:,3]
    return {
      "transparent":int((a==0).sum()),
      "low_alpha":int(((a>0)&(a<=low_max)).sum()),
      "unknown_transition":int(((a>low_max)&(a<opaque_min)).sum()),
      "near_or_fully_opaque":int((a>=opaque_min).sum()),
      "low_max":low_max,"opaque_min":opaque_min
    }
