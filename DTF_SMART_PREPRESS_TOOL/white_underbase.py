from dataclasses import dataclass,asdict
from typing import Dict,Any
from PIL import Image,ImageFilter
import numpy as np

MM_PER_INCH=25.4

@dataclass
class WhitePolicy:
    source_mode: str="alpha"
    gradient_policy: str="continuous"
    density: float=1.0
    alpha_cutoff: int|None=None
    alpha_gamma: float=1.0
    density_floor: float=0.0

def mm_to_radius_px(mm: float,effective_dpi: float)->int:
    return max(0,int(round(mm/MM_PER_INCH*effective_dpi)))

def _odd_size(radius:int)->int: return radius*2+1

def _density_map(alpha: np.ndarray,policy: WhitePolicy)->np.ndarray:
    a=alpha.astype(np.float32)/255.0
    if policy.gradient_policy=="continuous":
        m=a
    elif policy.gradient_policy=="binary":
        if policy.alpha_cutoff is None: raise ValueError("binary white policy requires alpha_cutoff")
        m=(alpha>=policy.alpha_cutoff).astype(np.float32)
    else:
        raise ValueError("gradient_policy must be continuous or binary")
    if policy.alpha_cutoff is not None and policy.gradient_policy=="continuous":
        m=np.where(alpha>=policy.alpha_cutoff,m,0.0)
    m=np.power(np.clip(m,0,1),max(policy.alpha_gamma,1e-6))
    if policy.density_floor>0:
        m=np.where(m>0,np.maximum(m,policy.density_floor),0)
    return np.clip(m*policy.density,0,1)

def generate_white_preview(input_path:str,output_path:str,effective_dpi:float,
                           choke_mm:float=0.0,spread_mm:float=0.0,density:float=1.0,
                           policy:WhitePolicy|None=None)->Dict[str,Any]:
    """Diagnostic white-support mask. It is never claimed as authoritative RIP output."""
    rgba=Image.open(input_path).convert("RGBA")
    alpha=np.asarray(rgba.getchannel("A"),dtype=np.uint8)
    policy=policy or WhitePolicy(density=density)
    mask=Image.fromarray(np.clip(_density_map(alpha,policy)*255+0.5,0,255).astype(np.uint8),"L")
    choke=mm_to_radius_px(choke_mm,effective_dpi); spread=mm_to_radius_px(spread_mm,effective_dpi)
    if choke: mask=mask.filter(ImageFilter.MinFilter(_odd_size(choke)))
    if spread: mask=mask.filter(ImageFilter.MaxFilter(_odd_size(spread)))
    mask.save(output_path)
    visible=alpha>0
    border_touch=bool(visible[0,:].any() or visible[-1,:].any() or visible[:,0].any() or visible[:,-1].any())
    return {"output":output_path,"choke_px":choke,"spread_px":spread,"policy":asdict(policy),
            "spread_canvas_clip_risk":bool(spread>0 and border_touch),
            "warning":"Diagnostic preview only; final RIP white must use a calibrated output profile."}
