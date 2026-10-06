from typing import Dict,Any
from PIL import Image
import numpy as np

def compare_images(reference_path:str,candidate_path:str)->Dict[str,Any]:
    a=np.asarray(Image.open(reference_path).convert("RGBA"),dtype=np.float32)
    b=np.asarray(Image.open(candidate_path).convert("RGBA").resize((a.shape[1],a.shape[0])),dtype=np.float32)
    mse=float(np.mean((a-b)**2))
    psnr=float("inf") if mse==0 else 20*np.log10(255.0)-10*np.log10(mse)
    alpha_mae=float(np.mean(np.abs(a[:,:,3]-b[:,:,3])))
    rgb_mae=float(np.mean(np.abs(a[:,:,:3]-b[:,:,:3])))
    return {"mse":round(mse,6),"psnr_db":"inf" if not np.isfinite(psnr) else round(float(psnr),4),
            "alpha_mae":round(alpha_mae,6),"rgb_mae":round(rgb_mae,6),
            "note":"These are fidelity diagnostics, not standalone print-quality pass/fail criteria."}
