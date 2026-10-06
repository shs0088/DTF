from typing import Dict,Any

def evaluate_canvas_margin(pixel_analysis:Dict[str,Any],effective_dpi:float,
                           required_margin_mm:float=0.0)->Dict[str,Any]:
    if effective_dpi<=0: raise ValueError("effective_dpi must be positive")
    bbox=pixel_analysis.get("content_bbox")
    w=pixel_analysis.get("width_px"); h=pixel_analysis.get("height_px")
    if not bbox or not w or not h:
        return {"available":False,"note":"Content bounds unavailable."}
    x0,y0,x1,y1=[int(v) for v in bbox]
    margins_px={"left":x0,"top":y0,"right":max(0,w-x1),"bottom":max(0,h-y1)}
    scale=25.4/effective_dpi
    margins_mm={k:round(v*scale,6) for k,v in margins_px.items()}
    minimum=min(margins_mm.values())
    return {
      "available":True,"margins_px":margins_px,"margins_mm":margins_mm,
      "minimum_margin_mm":round(minimum,6),
      "required_margin_mm":required_margin_mm,
      "sufficient":minimum>=required_margin_mm,
      "finding":None if minimum>=required_margin_mm else {
        "severity":"WARN","code":"INSUFFICIENT_CANVAS_MARGIN",
        "message":"Transparent canvas margin is smaller than the configured derivative/spread safety margin."
      }
    }
