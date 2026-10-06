from collections import deque
from typing import Dict,Any,List
import numpy as np,math
from PIL import Image

def _components(mask:np.ndarray)->List[int]:
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

def _hole_sizes(mask:np.ndarray)->List[int]:
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

def _mask_for_analysis(path:str,alpha_threshold:int,max_analysis_pixels:int):
    im=Image.open(path).convert("RGBA")
    alpha=im.getchannel("A")
    original=(im.width,im.height)
    pixels=im.width*im.height
    scale=1.0
    if pixels>max_analysis_pixels:
        scale=math.sqrt(max_analysis_pixels/pixels)
        nw=max(1,int(round(im.width*scale))); nh=max(1,int(round(im.height*scale)))
        alpha=alpha.resize((nw,nh),Image.Resampling.NEAREST)
    return np.asarray(alpha)>=alpha_threshold,original,scale

def analyze_topology(path:str,alpha_threshold:int=1,max_analysis_pixels:int=4_000_000)->Dict[str,Any]:
    mask,original,scale=_mask_for_analysis(path,alpha_threshold,max_analysis_pixels)
    comps=_components(mask); holes=_hole_sizes(mask)
    area_scale=1.0/(scale*scale)
    min_comp=(min(comps)*area_scale) if comps else 0
    max_comp=(max(comps)*area_scale) if comps else 0
    min_hole=(min(holes)*area_scale) if holes else 0
    max_hole=(max(holes)*area_scale) if holes else 0
    return {
      "alpha_threshold":alpha_threshold,
      "analysis_scale":round(float(scale),6),
      "original_size_px":list(original),
      "component_count":len(comps),
      "component_area_px":{"min":round(float(min_comp),3),"max":round(float(max_comp),3)},
      "hole_count":len(holes),
      "hole_area_px":{"min":round(float(min_hole),3),"max":round(float(max_hole),3)},
      "foreground_area_px":round(float(mask.sum()*area_scale),3),
      "note":"Large inputs may use a scaled nearest-neighbour mask. Counts/topology are diagnostic and should be reviewed when scale < 1."
    }

def compare_masks(before_path:str,after_mask_path:str,alpha_threshold:int=1,
                  max_analysis_pixels:int=4_000_000)->Dict[str,Any]:
    before=analyze_topology(before_path,alpha_threshold,max_analysis_pixels)
    after=analyze_topology(after_mask_path,alpha_threshold,max_analysis_pixels)
    b=max(float(before["foreground_area_px"]),1.0)
    return {
      "before":before,"after":after,
      "surviving_area_ratio":round(float(after["foreground_area_px"])/b,6),
      "components_lost":max(0,before["component_count"]-after["component_count"]),
      "holes_lost":max(0,before["hole_count"]-after["hole_count"])
    }
