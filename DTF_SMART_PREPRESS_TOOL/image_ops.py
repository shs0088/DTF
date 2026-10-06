from pathlib import Path
from typing import Dict, Any, Tuple
from PIL import Image, ImageFilter
import numpy as np

def _srgb_to_linear(x: np.ndarray) -> np.ndarray:
    x=np.clip(x,0.0,1.0)
    return np.where(x<=0.04045,x/12.92,((x+0.055)/1.055)**2.4)

def _linear_to_srgb(x: np.ndarray) -> np.ndarray:
    x=np.clip(x,0.0,1.0)
    return np.where(x<=0.0031308,12.92*x,1.055*(x**(1/2.4))-0.055)

def extend_hidden_rgb(input_path: str, output_path: str, iterations: int=8) -> Dict[str,Any]:
    """Fill RGB beneath fully transparent pixels from neighboring visible RGB.
    Alpha is never changed. This is edge-bleed preparation, not matte editing.
    """
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Derivative must not overwrite source")
    im=Image.open(src).convert("RGBA")
    a=np.asarray(im).copy()
    rgb=a[:,:,:3].astype(np.float32); alpha=a[:,:,3]
    known=alpha>0
    changed_total=0
    for _ in range(max(0,iterations)):
        sums=np.zeros_like(rgb); counts=np.zeros(alpha.shape,dtype=np.float32)
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            k=np.roll(np.roll(known,dy,axis=0),dx,axis=1)
            v=np.roll(np.roll(rgb,dy,axis=0),dx,axis=1)
            # exclude wrapped edges
            if dy>0: k[:dy,:]=False
            if dy<0: k[dy:,:]=False
            if dx>0: k[:,:dx]=False
            if dx<0: k[:,dx:]=False
            sums += v*k[:,:,None]; counts += k
        fill=(~known)&(counts>0)
        if not fill.any(): break
        rgb[fill]=sums[fill]/counts[fill,None]
        known[fill]=True
        changed_total += int(fill.sum())
    out=a.copy(); out[:,:,:3]=np.clip(rgb,0,255).astype(np.uint8)
    Image.fromarray(out,"RGBA").save(dst)
    return {"output":str(dst),"alpha_unchanged":True,"filled_transparent_rgb_pixels":changed_total,"iterations":iterations}

def resize_rgba_premultiplied_linear(input_path: str, output_path: str, size: Tuple[int,int],
                                     resample: str="lanczos") -> Dict[str,Any]:
    """Resize RGBA in linear-light premultiplied form to reduce edge halos."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Derivative must not overwrite source")
    im=np.asarray(Image.open(src).convert("RGBA"),dtype=np.float32)/255.0
    rgb=_srgb_to_linear(im[:,:,:3]); alpha=im[:,:,3:4]
    premul=rgb*alpha
    kernel={"lanczos":Image.Resampling.LANCZOS,"bicubic":Image.Resampling.BICUBIC,
            "bilinear":Image.Resampling.BILINEAR}.get(resample.lower())
    if kernel is None: raise ValueError("resample must be lanczos, bicubic, or bilinear")

    def resize_plane(arr):
        f=Image.fromarray(arr.astype(np.float32),mode="F")
        return np.asarray(f.resize(size,kernel),dtype=np.float32)

    pa=np.stack([resize_plane(premul[:,:,c]) for c in range(3)],axis=2)
    aa=resize_plane(alpha[:,:,0])[:,:,None]
    safe=np.maximum(aa,1e-8)
    straight=np.where(aa>1e-8,pa/safe,0.0)
    srgb=_linear_to_srgb(straight)
    out=np.concatenate([srgb, np.clip(aa,0,1)],axis=2)
    Image.fromarray(np.clip(out*255+0.5,0,255).astype(np.uint8),"RGBA").save(dst)
    return {"output":str(dst),"size_px":list(size),"resample":resample.lower(),
            "alpha_mode":"premultiplied","working_light":"linear-sRGB","source_unchanged":True}

def denoise_derivative(input_path: str, output_path: str, radius: int=1) -> Dict[str,Any]:
    """Conservative RGB median denoise; keeps original alpha exactly."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Derivative must not overwrite source")
    im=Image.open(src).convert("RGBA"); alpha=im.getchannel("A")
    rgb=im.convert("RGB").filter(ImageFilter.MedianFilter(size=max(3,radius*2+1)))
    out=rgb.convert("RGBA"); out.putalpha(alpha); out.save(dst)
    return {"output":str(dst),"method":"median","radius":radius,"alpha_unchanged":True}

def sharpen_derivative(input_path: str, output_path: str, radius: float=1.0,
                       percent: int=100, threshold: int=3) -> Dict[str,Any]:
    """Unsharp-mask derivative; keeps original alpha exactly."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Derivative must not overwrite source")
    im=Image.open(src).convert("RGBA"); alpha=im.getchannel("A")
    rgb=im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=radius,percent=percent,threshold=threshold))
    out=rgb.convert("RGBA"); out.putalpha(alpha); out.save(dst)
    return {"output":str(dst),"method":"unsharp_mask","radius":radius,"percent":percent,
            "threshold":threshold,"alpha_unchanged":True}
