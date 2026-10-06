from __future__ import annotations
from typing import Dict,Any

def validate_print_area_placement(print_area_id:str,
                                  area_width_mm:float,area_height_mm:float,
                                  x_mm:float,y_mm:float,width_mm:float,height_mm:float,
                                  rotation_deg:float=0.0,surface_id:str|None=None)->Dict[str,Any]:
    vals=(area_width_mm,area_height_mm,width_mm,height_mm)
    if any(v<=0 for v in vals): raise ValueError("area and placement dimensions must be positive")
    if x_mm<0 or y_mm<0: raise ValueError("placement origin must be inside the print area")
    # Bounds are evaluated on the unrotated DTF placement rectangle. Rotation is preserved as preview metadata
    # and must be re-evaluated by the renderer if non-zero.
    right=x_mm+width_mm; bottom=y_mm+height_mm
    fits_unrotated=right<=area_width_mm and bottom<=area_height_mm
    rotation_requires_renderer_check=abs(rotation_deg)%180 not in (0.0,)
    findings=[]
    if not fits_unrotated:
        findings.append({"severity":"FAIL","code":"PLACEMENT_OUTSIDE_PRINT_AREA",
                         "message":"DTF placement rectangle exceeds the configured print area."})
    if rotation_requires_renderer_check:
        findings.append({"severity":"INFO","code":"ROTATED_PLACEMENT_REQUIRES_BOUNDING_CHECK",
                         "message":"Non-zero rotation is stored as placement metadata; final renderer must validate rotated bounds."})
    return {
      "placement_space":"dtf_print_area",
      "print_area_id":print_area_id,
      "surface_id":surface_id,
      "area_mm":[area_width_mm,area_height_mm],
      "placement_mm":{"x":x_mm,"y":y_mm,"width":width_mm,"height":height_mm,"rotation_deg":rotation_deg},
      "normalized":{"x":x_mm/area_width_mm,"y":y_mm/area_height_mm,
                    "width":width_mm/area_width_mm,"height":height_mm/area_height_mm},
      "fits_unrotated":fits_unrotated,
      "rotation_requires_renderer_check":rotation_requires_renderer_check,
      "findings":findings,
      "uv_mapping_used":False,
      "note":"Placement is defined in the DTF printable area, not as a generic UV/material texture transform."
    }
