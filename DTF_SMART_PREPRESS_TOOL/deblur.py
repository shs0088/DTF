from pathlib import Path
from typing import Dict,Any
from PIL import Image
import numpy as np

def _gaussian_psf(size:int,sigma:float)->np.ndarray:
    if size<3 or size%2==0: raise ValueError("psf_size must be odd and >=3")
    if sigma<=0: raise ValueError("sigma must be positive")
    ax=np.arange(-(size//2),size//2+1,dtype=np.float32)
    xx,yy=np.meshgrid(ax,ax)
    k=np.exp(-(xx*xx+yy*yy)/(2*sigma*sigma))
    return k/k.sum()

def _wiener(channel:np.ndarray,psf:np.ndarray,balance:float)->np.ndarray:
    h,w=channel.shape
    p=np.zeros((h,w),dtype=np.float32)
    kh,kw=psf.shape
    p[:kh,:kw]=psf
    p=np.roll(p,-kh//2,axis=0); p=np.roll(p,-kw//2,axis=1)
    H=np.fft.fft2(p); G=np.fft.fft2(channel)
    F=np.conj(H)*G/(np.abs(H)**2+max(balance,1e-8))
    return np.real(np.fft.ifft2(F))

def wiener_deblur_derivative(input_path:str,output_path:str,psf_size:int=7,sigma:float=1.4,
                             balance:float=0.01,max_megapixels:float=20.0)->Dict[str,Any]:
    """Explicit Wiener candidate. PSF is user/configuration supplied; blur is not guessed."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("Deblur must create a derivative")
    im=Image.open(src).convert("RGBA")
    if im.width*im.height>max_megapixels*1_000_000:
        raise ValueError("image exceeds configured deblur memory limit")
    arr=np.asarray(im,dtype=np.float32); alpha=arr[:,:,3].copy()
    psf=_gaussian_psf(psf_size,sigma)
    pad=psf_size
    rgb=arr[:,:,:3]/255.0
    out=np.empty_like(rgb)
    for c in range(3):
        padded=np.pad(rgb[:,:,c],pad,mode="reflect")
        restored=_wiener(padded,psf,balance)
        out[:,:,c]=restored[pad:-pad,pad:-pad]
    rgba=np.dstack([np.clip(out*255,0,255),alpha]).astype(np.uint8)
    Image.fromarray(rgba,"RGBA").save(dst)
    return {"output":str(dst),"method":"wiener","psf":"gaussian","psf_size":psf_size,
            "sigma":sigma,"balance":balance,"alpha_unchanged":True,
            "warning":"Deblurring can amplify noise/ringing; compare candidate against source before acceptance."}
