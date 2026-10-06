from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from hashlib import sha256
import json

def profile_fingerprint(profile:Dict[str,Any])->str:
    payload=json.dumps(profile,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode("utf-8")
    return sha256(payload).hexdigest()

def validate_output_profile(profile:Dict[str,Any])->Dict[str,Any]:
    errors=[]; warnings=[]
    if not isinstance(profile,dict): return {"valid":False,"errors":["profile must be an object"],"warnings":[]}
    if not profile.get("profile_id"): errors.append("profile_id is required")
    for key in ("min_effective_dpi","max_aspect_distortion_percent"):
        v=profile.get(key)
        if v is not None:
            try:
                if float(v)<0: errors.append(f"{key} must be >= 0")
            except Exception: errors.append(f"{key} must be numeric or null")
    white=profile.get("white_policy") or {}
    if not isinstance(white,dict): errors.append("white_policy must be an object")
    else:
        for key in ("choke_mm","spread_mm","density","density_floor","alpha_gamma"):
            v=white.get(key)
            if v is not None:
                try:
                    fv=float(v)
                    if fv<0: errors.append(f"white_policy.{key} must be >= 0")
                except Exception: errors.append(f"white_policy.{key} must be numeric or null")
        gp=white.get("gradient_policy")
        if gp is not None and gp not in ("continuous","binary"):
            errors.append("white_policy.gradient_policy must be continuous or binary")
        cutoff=white.get("alpha_cutoff")
        if cutoff is not None:
            try:
                if not 0<=int(cutoff)<=255: errors.append("white_policy.alpha_cutoff must be 0..255")
            except Exception: errors.append("white_policy.alpha_cutoff must be integer or null")
    pt=profile.get("printability_thresholds") or {}
    if not isinstance(pt,dict): errors.append("printability_thresholds must be an object")
    else:
        for key in ("min_stroke_mm","min_island_area_mm2"):
            v=pt.get(key)
            if v is not None:
                try:
                    if float(v)<0: errors.append(f"printability_thresholds.{key} must be >= 0")
                except Exception: errors.append(f"printability_thresholds.{key} must be numeric or null")
    if not profile.get("icc_revision"): warnings.append("icc_revision is unset")
    return {"valid":not errors,"errors":errors,"warnings":warnings,
            "fingerprint_sha256":profile_fingerprint(profile)}

def load_output_profile(path:str)->Dict[str,Any]:
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    validation=validate_output_profile(data)
    if not validation["valid"]:
        raise ValueError("invalid output profile: "+"; ".join(validation["errors"]))
    return data

def calibration_readiness(profile:Dict[str,Any])->Dict[str,Any]:
    validation=validate_output_profile(profile)
    missing=[]
    for key in ("printer","ink_set","film_media","rip","print_mode","icc_revision","screening"):
        if not profile.get(key): missing.append(key)
    white=profile.get("white_policy") or {}
    thresholds=profile.get("printability_thresholds") or {}
    if white.get("choke_mm") is None: missing.append("white_policy.choke_mm")
    if white.get("spread_mm") is None: missing.append("white_policy.spread_mm")
    if thresholds.get("min_stroke_mm") is None: missing.append("printability_thresholds.min_stroke_mm")
    return {
      "valid":validation["valid"],
      "profile_fingerprint_sha256":validation["fingerprint_sha256"],
      "calibrated_for_authoritative_gate":validation["valid"] and len(missing)==0,
      "missing_or_unset":missing,
      "validation_errors":validation["errors"],
      "validation_warnings":validation["warnings"],
      "note":"Missing calibration values do not make image analysis invalid, but they prevent claiming printer-specific readiness."
    }
