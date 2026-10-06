from typing import Dict, Any
from image_analysis import analyze_pixels
from preflight import ImageFacts, OutputProfile, analyze
from topology import analyze_topology
from security import validate_upload
from color_management import inspect_color
from composite_qa import composite_stats
from printability import evaluate_physical_features

def inspect_master(path: str, width_in: float, height_in: float,
                   choke_mm: float=0.0, spread_mm: float=0.0,
                   min_stroke_mm: float|None=None,
                   min_island_area_mm2: float|None=None) -> Dict[str,Any]:
    security=validate_upload(path)
    if not security["ok"]: return {"status":"FAIL","security":security}
    px=analyze_pixels(path)
    facts=ImageFacts(px["width_px"],px["height_px"],width_in,height_in,px["has_alpha"],
                     px["semi_transparent_ratio"],px["low_alpha_ratio"],px["min_run_px"])
    profile=OutputProfile("pipeline",choke_mm,spread_mm)
    report=analyze(facts,profile)
    topo=analyze_topology(path)
    report.update({"security":security,"pixel_analysis":px,"topology":topo,
                   "color":inspect_color(path),"composite_qa":composite_stats(path)})
    pr=evaluate_physical_features(px["min_run_px"],report["effective_dpi"]["minimum"],
                                  min_stroke_mm,min_island_area_mm2,topo["component_area_px"]["min"])
    report["printability"]=pr
    if pr["findings"]:
        report["findings"].extend(pr["findings"])
        if any(x["severity"]=="FAIL" for x in pr["findings"]): report["status"]="FAIL"
    return report
