from __future__ import annotations
from typing import Dict,Any
from candidate_manager import CandidateManager
from background import border_connected_color_key
from image_ops import extend_hidden_rgb,resize_rgba_premultiplied_linear,denoise_derivative,sharpen_derivative
from deblur import wiener_deblur_derivative
from thresholding import threshold_alpha_candidate
from morphology import apply_alpha_morphology

SUPPORTED={
  "background_border_key","edge_bleed","resize","denoise","sharpen","deblur","threshold","morphology"
}

def create_candidate(source_path:str,operation:str,params:Dict[str,Any]|None=None,
                     manager:CandidateManager|None=None)->Dict[str,Any]:
    params=params or {}
    if operation not in SUPPORTED: raise ValueError(f"unsupported operation: {operation}")
    m=manager or CandidateManager()
    out=m.path_for(operation)

    if operation=="background_border_key":
        meta=border_connected_color_key(source_path,out,float(params.get("tolerance",24.0)),
                                        tuple(params["key_rgb"]) if params.get("key_rgb") else None)
        alpha_changed=True
    elif operation=="edge_bleed":
        meta=extend_hidden_rgb(source_path,out,int(params.get("iterations",8))); alpha_changed=False
    elif operation=="resize":
        width=int(params["width_px"]); height=int(params["height_px"])
        meta=resize_rgba_premultiplied_linear(source_path,out,(width,height),str(params.get("resample","lanczos")))
        alpha_changed=True
    elif operation=="denoise":
        meta=denoise_derivative(source_path,out,int(params.get("radius",1))); alpha_changed=False
    elif operation=="sharpen":
        meta=sharpen_derivative(source_path,out,float(params.get("radius",1.0)),
                                int(params.get("percent",100)),int(params.get("threshold",3))); alpha_changed=False
    elif operation=="deblur":
        meta=wiener_deblur_derivative(source_path,out,int(params.get("psf_size",7)),
                                      float(params.get("sigma",1.4)),float(params.get("balance",0.01))); alpha_changed=False
    elif operation=="threshold":
        meta=threshold_alpha_candidate(source_path,out,str(params.get("method","otsu")),
                                       params.get("threshold")); alpha_changed=True
    else:
        meta=apply_alpha_morphology(source_path,out,str(params["morphology_operation"]),
                                    float(params["radius_mm"]),float(params["effective_dpi"]),
                                    int(params.get("iterations",1))); alpha_changed=True

    registered=m.register_candidate(source_path,out,operation,params,alpha_changed)
    return {"operation_result":meta,**registered}
