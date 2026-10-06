from collections import deque
from typing import Dict, Any, List
import numpy as np
from PIL import Image

def _components(mask: np.ndarray) -> List[int]:
    h,w=mask.shape; seen=np.zeros_like(mask,dtype=bool); sizes=[]
    for y in range(h):
        for x in range(w):
            if not mask[y,x] or seen[y,x]: continue
            q=deque([(y,x)]); seen[y,x]=1; n=0
            while q:
                cy,cx=q.popleft(); n+=1
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny,nx=cy+dy,cx+dx
                    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=1; q.append((ny,nx))
            sizes.append(n)
    return sizes

def _hole_sizes(mask: np.ndarray) -> List[int]:
    bg=~mask; h,w=bg.shape; exterior=np.zeros_like(bg,dtype=bool); q=deque()
    for x in range(w):
        for y in (0,h-1):
            if bg[y,x] and not exterior[y,x]: exterior[y,x]=1; q.append((y,x))
    for y in range(h):
        for x in (0,w-1):
            if bg[y,x] and not exterior[y,x]: exterior[y,x]=1; q.append((y,x))
    while q:
        cy,cx=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=cy+dy,cx+dx
            if 0<=ny<h and 0<=nx<w and bg[ny,nx] and not exterior[ny,nx]:
                exterior[ny,nx]=1; q.append((ny,nx))
    return _components(bg & ~exterior)

def analyze_topology(path: str, alpha_threshold: int=1) -> Dict[str,Any]:
    a=np.asarray(Image.open(path).convert("RGBA"))[:,:,3]
    mask=a>=alpha_threshold
    comps=_components(mask); holes=_hole_sizes(mask)
    return {
      "alpha_threshold":alpha_threshold,
      "component_count":len(comps),
      "component_area_px":{"min":min(comps) if comps else 0,"max":max(comps) if comps else 0},
      "hole_count":len(holes),
      "hole_area_px":{"min":min(holes) if holes else 0,"max":max(holes) if holes else 0},
      "foreground_area_px":int(mask.sum())
    }

def compare_masks(before_path: str, after_mask_path: str, alpha_threshold: int=1) -> Dict[str,Any]:
    before=analyze_topology(before_path,alpha_threshold)
    after=analyze_topology(after_mask_path,alpha_threshold)
    b=max(before["foreground_area_px"],1)
    return {
      "before":before,"after":after,
      "surviving_area_ratio":round(after["foreground_area_px"]/b,6),
      "components_lost":max(0,before["component_count"]-after["component_count"]),
      "holes_lost":max(0,before["hole_count"]-after["hole_count"])
    }
