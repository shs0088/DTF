from typing import Dict, Any
from PIL import Image, ImageFilter
import numpy as np

MM_PER_INCH=25.4

def mm_to_radius_px(mm: float, effective_dpi: float) -> int:
    return max(0, int(round(mm/MM_PER_INCH*effective_dpi)))

def _odd_size(radius: int) -> int:
    return radius*2+1

def generate_white_preview(input_path: str, output_path: str, effective_dpi: float,
                           choke_mm: float=0.0, spread_mm: float=0.0,
                           density: float=1.0) -> Dict[str, Any]:
    """Generate a diagnostic white-support mask, not RIP-authoritative output."""
    rgba=Image.open(input_path).convert("RGBA")
    alpha=rgba.getchannel("A")
    choke=mm_to_radius_px(choke_mm,effective_dpi)
    spread=mm_to_radius_px(spread_mm,effective_dpi)
    mask=alpha
    if choke:
        mask=mask.filter(ImageFilter.MinFilter(_odd_size(choke)))
    if spread:
        mask=mask.filter(ImageFilter.MaxFilter(_odd_size(spread)))
    density=max(0.0,min(1.0,density))
    if density != 1.0:
        arr=np.asarray(mask,dtype=np.float32)*density
        mask=Image.fromarray(np.clip(arr,0,255).astype(np.uint8),"L")
    mask.save(output_path)
    return {"output":output_path,"choke_px":choke,"spread_px":spread,"density":density,
            "warning":"Diagnostic preview only; final RIP white must use a calibrated output profile."}
