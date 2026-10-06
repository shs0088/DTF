from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from PIL import Image,ImageFilter
from topology import analyze_topology
from white_underbase import mm_to_radius_px

def topology_guarded_choke_preview(input_path:str,output_path:str,effective_dpi:float,
                                   requested_choke_mm:float)->Dict[str,Any]:
    """Apply the largest global choke not changing component/hole counts.
    This is a topology guard, not a full local adaptive-choke algorithm.
    """
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("White preview must not overwrite source")
    rgba=Image.open(src).convert("RGBA")
    alpha=rgba.getchannel("A")
    requested_px=mm_to_radius_px(requested_choke_mm,effective_dpi)
    original=analyze_topology(str(src),1)
    chosen=0; chosen_topology=original
    for r in range(requested_px,-1,-1):
        mask=alpha if r==0 else alpha.filter(ImageFilter.MinFilter(r*2+1))
        mask.save(dst)
        topo=analyze_topology(str(dst),1)
        if topo["component_count"]==original["component_count"] and topo["hole_count"]==original["hole_count"]:
            chosen=r; chosen_topology=topo; break
    applied_mm=chosen/effective_dpi*25.4
    return {
      "output":str(dst),
      "requested_choke_mm":requested_choke_mm,
      "requested_choke_px":requested_px,
      "applied_choke_px":chosen,
      "applied_choke_mm":round(applied_mm,6),
      "backoff_px":requested_px-chosen,
      "topology_preserved":chosen_topology["component_count"]==original["component_count"] and chosen_topology["hole_count"]==original["hole_count"],
      "before_topology":original,
      "after_topology":chosen_topology,
      "mode":"global_topology_guarded_choke",
      "warning":"This protects component/hole counts only. It is not a substitute for printed calibration or local feature-width QA."
    }
