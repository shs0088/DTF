from __future__ import annotations
from pathlib import Path
from typing import Dict, Any
import json

def load_output_profile(path: str) -> Dict[str,Any]:
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data,dict) or not data.get("profile_id"):
        raise ValueError("output profile requires profile_id")
    return data

def calibration_readiness(profile: Dict[str,Any]) -> Dict[str,Any]:
    missing=[]
    for key in ("printer","ink_set","film_media","rip","print_mode","icc_revision","screening"):
        if not profile.get(key): missing.append(key)
    white=profile.get("white_policy") or {}
    thresholds=profile.get("printability_thresholds") or {}
    if white.get("choke_mm") is None: missing.append("white_policy.choke_mm")
    if white.get("spread_mm") is None: missing.append("white_policy.spread_mm")
    if thresholds.get("min_stroke_mm") is None: missing.append("printability_thresholds.min_stroke_mm")
    return {
      "calibrated_for_authoritative_gate":len(missing)==0,
      "missing_or_unset":missing,
      "note":"Missing calibration values do not make image analysis invalid, but they prevent claiming printer-specific readiness."
    }
