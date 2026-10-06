from typing import Dict, Any

def px_to_mm(px: float, dpi: float) -> float:
    if dpi<=0: raise ValueError("dpi must be positive")
    return px/dpi*25.4

def evaluate_physical_features(min_run_px: int|None, effective_dpi: float,
                               min_stroke_mm: float|None=None,
                               min_island_area_mm2: float|None=None,
                               min_island_area_px: int|None=None) -> Dict[str,Any]:
    """Thresholds are output-profile inputs; no universal DTF limits are hard-coded."""
    out={"effective_dpi":effective_dpi,"configured_thresholds":{
        "min_stroke_mm":min_stroke_mm,"min_island_area_mm2":min_island_area_mm2}}
    if min_run_px is not None:
        out["measured_min_run_px"]=min_run_px
        out["measured_min_run_mm"]=round(px_to_mm(min_run_px,effective_dpi),6)
    findings=[]
    if min_stroke_mm is not None and min_run_px is not None and px_to_mm(min_run_px,effective_dpi)<min_stroke_mm:
        findings.append({"severity":"FAIL","code":"MIN_STROKE_BELOW_PROFILE",
                         "message":"Measured feature is below the configured output-profile threshold."})
    if min_island_area_mm2 is not None and min_island_area_px is not None:
        area_mm2=min_island_area_px*(25.4/effective_dpi)**2
        out["measured_min_island_area_mm2"]=round(area_mm2,8)
        if area_mm2<min_island_area_mm2:
            findings.append({"severity":"FAIL","code":"MIN_ISLAND_BELOW_PROFILE",
                             "message":"Smallest component is below the configured output-profile threshold."})
    out["findings"]=findings
    return out
