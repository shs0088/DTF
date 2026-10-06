from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np

_BAYER4=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]],dtype=np.float32)

def _channel_values(input_path:str,channel:str)->np.ndarray:
    rgba=np.asarray(Image.open(input_path).convert("RGBA"),dtype=np.uint8)
    rgb=rgba[:,:,:3].astype(np.float32)/255.0
    alpha=rgba[:,:,3].astype(np.float32)/255.0
    if channel=="luminance":
        return 0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2]
    if channel=="alpha": return alpha
    raise ValueError("channel must be luminance or alpha")

def ordered_bayer_preview(input_path:str,output_path:str,channel:str="luminance")->Dict[str,Any]:
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Halftone preview must not overwrite source")
    v=_channel_values(str(src),channel); h,w=v.shape
    threshold=(np.tile(_BAYER4,(int(np.ceil(h/4)),int(np.ceil(w/4))))[:h,:w]+0.5)/16.0
    dots=(v>=threshold).astype(np.uint8)*255
    Image.fromarray(dots,"L").save(dst)
    return {"output":str(dst),"family":"ordered","algorithm":"Bayer","matrix":"4x4","channel":channel,
            "warning":"Diagnostic preview only; no LPI/angle/minimum-dot/TVI calibration is implied."}

def _diffuse(v:np.ndarray,algorithm:str,serpentine:bool=True)->np.ndarray:
    a=v.astype(np.float32).copy()
    h,w=a.shape; out=np.zeros((h,w),dtype=np.uint8)
    if algorithm=="floyd-steinberg":
        base=[(1,0,7/16),(-1,1,3/16),(0,1,5/16),(1,1,1/16)]
    elif algorithm=="atkinson":
        base=[(1,0,1/8),(2,0,1/8),(-1,1,1/8),(0,1,1/8),(1,1,1/8),(0,2,1/8)]
    else: raise ValueError("algorithm must be floyd-steinberg or atkinson")
    for y in range(h):
        reverse=serpentine and (y%2==1)
        xs=range(w-1,-1,-1) if reverse else range(w)
        for x in xs:
            old=float(a[y,x]); new=1.0 if old>=0.5 else 0.0
            out[y,x]=255 if new else 0
            err=old-new
            for dx,dy,weight in base:
                ddx=-dx if reverse else dx
                nx,ny=x+ddx,y+dy
                if 0<=nx<w and 0<=ny<h:
                    a[ny,nx]=np.clip(a[ny,nx]+err*weight,0.0,1.0)
    return out

def error_diffusion_preview(input_path:str,output_path:str,algorithm:str="floyd-steinberg",
                            channel:str="luminance",serpentine:bool=True)->Dict[str,Any]:
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Halftone preview must not overwrite source")
    v=_channel_values(str(src),channel)
    dots=_diffuse(v,algorithm,serpentine)
    Image.fromarray(dots,"L").save(dst)
    return {"output":str(dst),"family":"error_diffusion","algorithm":algorithm,
            "scan_order":"serpentine" if serpentine else "left_to_right","channel":channel,
            "warning":"Diagnostic preview only; printer minimum-dot, dot gain and output-resolution calibration are not implied."}
