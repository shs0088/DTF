from pathlib import Path
from typing import Dict,Any
from PIL import Image,ImageFilter
import numpy as np

def _radius_px(radius_mm:float,dpi:float)->int:
    if dpi<=0: raise ValueError("dpi must be positive")
    return max(0,int(round(radius_mm/25.4*dpi)))

def apply_alpha_morphology(input_path:str,output_path:str,operation:str,radius_mm:float,
                           effective_dpi:float,iterations:int=1)->Dict[str,Any]:
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Morphology must create a derivative")
    im=Image.open(src).convert("RGBA"); alpha=im.getchannel("A")
    r=_radius_px(radius_mm,effective_dpi)
    if r==0:
        im.save(dst); return {"output":str(dst),"operation":operation,"radius_px":0,"iterations":0}
    size=r*2+1
    def erode(x): return x.filter(ImageFilter.MinFilter(size))
    def dilate(x): return x.filter(ImageFilter.MaxFilter(size))
    op=operation.lower()
    for _ in range(max(1,iterations)):
        if op=="erode": alpha=erode(alpha)
        elif op=="dilate": alpha=dilate(alpha)
        elif op=="open": alpha=dilate(erode(alpha))
        elif op=="close": alpha=erode(dilate(alpha))
        else: raise ValueError("operation must be erode, dilate, open, or close")
    out=im.copy(); out.putalpha(alpha); out.save(dst)
    return {"output":str(dst),"operation":op,"radius_mm":radius_mm,"radius_px":r,
            "iterations":iterations,"alpha_geometry_changed":True,
            "warning":"Run topology/feature-survival QA before accepting this derivative."}
