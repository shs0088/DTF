from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from PIL import Image,ImageFilter
from topology import analyze_topology
from white_underbase import mm_to_radius_px

def _topology_equal(a:dict,b:dict)->bool:
    return a["component_count"]==b["component_count"] and a["hole_count"]==b["hole_count"]

def topology_guarded_white_preview(input_path:str,output_path:str,effective_dpi:float,
                                   requested_choke_mm:float=0.0,
                                   requested_spread_mm:float=0.0)->Dict[str,Any]:
    """Choose the largest global choke and spread that preserve component/hole counts.
    This is a topology guard, not a full local adaptive-choke algorithm.
    """
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("White preview must not overwrite source")
    if effective_dpi<=0: raise ValueError("effective_dpi must be positive")
    rgba=Image.open(src).convert("RGBA")
    alpha=rgba.getchannel("A")
    req_choke=mm_to_radius_px(requested_choke_mm,effective_dpi)
    req_spread=mm_to_radius_px(requested_spread_mm,effective_dpi)
    original=analyze_topology(str(src),1)

    chosen_choke=0; choke_mask=alpha; choke_topology=original
    for r in range(req_choke,-1,-1):
        mask=alpha if r==0 else alpha.filter(ImageFilter.MinFilter(r*2+1))
        mask.save(dst)
        topo=analyze_topology(str(dst),1)
        if _topology_equal(original,topo):
            chosen_choke=r; choke_mask=mask; choke_topology=topo; break

    chosen_spread=0; final_mask=choke_mask; final_topology=choke_topology
    for r in range(req_spread,-1,-1):
        mask=choke_mask if r==0 else choke_mask.filter(ImageFilter.MaxFilter(r*2+1))
        mask.save(dst)
        topo=analyze_topology(str(dst),1)
        if _topology_equal(original,topo):
            chosen_spread=r; final_mask=mask; final_topology=topo; break

    final_mask.save(dst)
    return {
      "output":str(dst),
      "requested_choke_mm":requested_choke_mm,
      "requested_choke_px":req_choke,
      "applied_choke_px":chosen_choke,
      "applied_choke_mm":round(chosen_choke/effective_dpi*25.4,6),
      "choke_backoff_px":req_choke-chosen_choke,
      "requested_spread_mm":requested_spread_mm,
      "requested_spread_px":req_spread,
      "applied_spread_px":chosen_spread,
      "applied_spread_mm":round(chosen_spread/effective_dpi*25.4,6),
      "spread_backoff_px":req_spread-chosen_spread,
      "topology_preserved":_topology_equal(original,final_topology),
      "before_topology":original,
      "after_topology":final_topology,
      "mode":"global_topology_guarded_white",
      "warning":"This protects component/hole counts only. It is not a substitute for printed calibration or local feature-width QA."
    }

def topology_guarded_choke_preview(input_path:str,output_path:str,effective_dpi:float,
                                   requested_choke_mm:float)->Dict[str,Any]:
    """Backward-compatible choke-only wrapper."""
    return topology_guarded_white_preview(input_path,output_path,effective_dpi,requested_choke_mm,0.0)
