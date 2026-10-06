from typing import Dict,Any
from image_analysis import analyze_pixels
from preflight import ImageFacts,OutputProfile,analyze
from topology import analyze_topology
from security import validate_upload
from color_management import inspect_color
from composite_qa import composite_stats
from printability import evaluate_physical_features
from edge_quality import analyze_edge_rgb
from provenance import asset_record
from profile_loader import load_output_profile,calibration_readiness
from acceptance import evaluate_master_gate
from recommendations import build_recommendations

def _profile_values(profile_data:Dict[str,Any]|None,choke_mm:float,spread_mm:float,
                    min_stroke_mm:float|None,min_island_area_mm2:float|None)->dict:
    d=profile_data or {}
    white=d.get("white_policy") or {}
    pt=d.get("printability_thresholds") or {}
    return {
      "profile_id":d.get("profile_id","pipeline"),
      "choke_mm":choke_mm if choke_mm is not None else float(white.get("choke_mm") or 0.0),
      "spread_mm":spread_mm if spread_mm is not None else float(white.get("spread_mm") or 0.0),
      "min_stroke_mm":min_stroke_mm if min_stroke_mm is not None else pt.get("min_stroke_mm"),
      "min_island_area_mm2":min_island_area_mm2 if min_island_area_mm2 is not None else pt.get("min_island_area_mm2"),
      "min_effective_dpi":d.get("min_effective_dpi"),
      "max_aspect_distortion_percent":float(d.get("max_aspect_distortion_percent",1.0)),
      "white_source_mode":white.get("source_mode","generated")
    }

def inspect_master(path:str,width_in:float,height_in:float,
                   choke_mm:float|None=0.0,spread_mm:float|None=0.0,
                   min_stroke_mm:float|None=None,min_island_area_mm2:float|None=None,
                   output_profile_path:str|None=None,
                   require_calibrated_profile:bool=False)->Dict[str,Any]:
    security=validate_upload(path)
    if not security["ok"]: return {"status":"FAIL","security":security}

    profile_data=load_output_profile(output_profile_path) if output_profile_path else None
    pv=_profile_values(profile_data,choke_mm,spread_mm,min_stroke_mm,min_island_area_mm2)

    px=analyze_pixels(path)
    facts=ImageFacts(px["width_px"],px["height_px"],width_in,height_in,px["has_alpha"],
                     px["semi_transparent_ratio"],px["low_alpha_ratio"],px["min_run_px"])
    profile=OutputProfile(pv["profile_id"],pv["choke_mm"],pv["spread_mm"],
                          pv["min_stroke_mm"],pv["white_source_mode"],
                          pv["min_effective_dpi"],pv["max_aspect_distortion_percent"])
    report=analyze(facts,profile)
    topo=analyze_topology(path)
    report.update({
      "security":security,
      "pixel_analysis":px,
      "topology":topo,
      "edge_quality":analyze_edge_rgb(path),
      "color":inspect_color(path),
      "composite_qa":composite_stats(path),
      "source_asset":asset_record(path,"uploaded_master_candidate")
    })

    pr=evaluate_physical_features(px["min_run_px"],report["effective_dpi"]["minimum"],
                                  pv["min_stroke_mm"],pv["min_island_area_mm2"],
                                  topo["component_area_px"]["min"])
    report["printability"]=pr
    if pr["findings"]:
        report["findings"].extend(pr["findings"])
        if any(x["severity"]=="FAIL" for x in pr["findings"]): report["status"]="FAIL"

    if profile_data:
        report["output_profile"]=profile_data
        report["calibration_readiness"]=calibration_readiness(profile_data)
    else:
        report["calibration_readiness"]={
          "calibrated_for_authoritative_gate":False,
          "missing_or_unset":["output_profile"],
          "note":"No printer/RIP output profile was supplied."
        }

    report["master_gate"]=evaluate_master_gate(report,require_alpha=True,
                                                require_calibrated_profile=require_calibrated_profile)
    report["recommendations"]=build_recommendations(report)
    return report
