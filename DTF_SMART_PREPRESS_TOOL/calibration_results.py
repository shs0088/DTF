from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
import json,copy

REQUIRED_CONDITION=("printer","ink_set","film_media","rip","print_mode")

def build_profile_from_observations(base_profile_path:str,observations_path:str,output_path:str)->Dict[str,Any]:
    base=json.loads(Path(base_profile_path).read_text(encoding="utf-8"))
    obs=json.loads(Path(observations_path).read_text(encoding="utf-8"))
    missing=[k for k in REQUIRED_CONDITION if not obs.get(k)]
    if missing: raise ValueError("missing output-condition fields: "+",".join(missing))
    for k in ("min_stable_stroke_mm","selected_choke_mm"):
        if obs.get(k) is None: raise ValueError(f"observation {k} is required")
    out=copy.deepcopy(base)
    out["profile_id"]=obs.get("profile_id") or base.get("profile_id") or "calibrated"
    for k in REQUIRED_CONDITION+("icc_revision","screening"):
        if k in obs: out[k]=obs.get(k)
    out.setdefault("printability_thresholds",{})["min_stroke_mm"]=float(obs["min_stable_stroke_mm"])
    if obs.get("min_stable_island_diameter_mm") is not None:
        dia=float(obs["min_stable_island_diameter_mm"])
        out["printability_thresholds"]["min_island_area_mm2"]=3.141592653589793*(dia/2)**2
    out.setdefault("white_policy",{})["choke_mm"]=float(obs["selected_choke_mm"])
    if obs.get("selected_spread_mm") is not None:
        out["white_policy"]["spread_mm"]=float(obs["selected_spread_mm"])
    out["calibration_evidence"]={
      "observations_file":str(observations_path),
      "min_stable_hole_diameter_mm":obs.get("min_stable_hole_diameter_mm"),
      "notes":obs.get("notes")
    }
    Path(output_path).write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    return out
