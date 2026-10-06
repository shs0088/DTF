from typing import Dict,Any

def evaluate_print_area(print_width_in:float,print_height_in:float,
                        area_width_in:float|None=None,area_height_in:float|None=None,
                        allow_rotation:bool=False)->Dict[str,Any]:
    if print_width_in<=0 or print_height_in<=0: raise ValueError("print size must be positive")
    out={"requested_print_inches":[print_width_in,print_height_in],
         "print_area_inches":None,"fits":None,"rotation_considered":allow_rotation,
         "findings":[]}
    if area_width_in is None or area_height_in is None:
        out["note"]="No product print area supplied; compatibility cannot be asserted."
        return out
    if area_width_in<=0 or area_height_in<=0: raise ValueError("print area must be positive")
    out["print_area_inches"]=[area_width_in,area_height_in]
    fits=print_width_in<=area_width_in and print_height_in<=area_height_in
    rotated=False
    if not fits and allow_rotation:
        rotated=print_height_in<=area_width_in and print_width_in<=area_height_in
        fits=rotated
    out["fits"]=fits
    out["fits_if_rotated"]=rotated
    out["width_utilization"]=round(print_width_in/area_width_in,6)
    out["height_utilization"]=round(print_height_in/area_height_in,6)
    if not fits:
        out["findings"].append({"severity":"FAIL","code":"PRINT_AREA_OVERFLOW",
          "message":"Requested physical print size exceeds the configured product print area."})
    return out
