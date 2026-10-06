from __future__ import annotations
from pathlib import Path
from shutil import copy2
from typing import Dict, Any
from provenance import sha256_file, asset_record

def evaluate_master_gate(report: Dict[str,Any], require_alpha: bool=True,
                         require_calibrated_profile: bool=False) -> Dict[str,Any]:
    reasons=[]
    if report.get("status")=="FAIL":
        reasons.append("preflight_has_failures")
    if require_alpha and not (report.get("pixel_analysis") or {}).get("has_alpha",False):
        reasons.append("source_has_no_alpha")
    if require_calibrated_profile:
        readiness=report.get("calibration_readiness") or {}
        if not readiness.get("calibrated_for_authoritative_gate",False):
            reasons.append("output_profile_not_calibrated")
    return {"eligible":not reasons,"blocking_reasons":reasons}

def accept_candidate_as_new_master(candidate_path: str, destination_path: str,
                                   report: Dict[str,Any], explicit_accept: bool=False,
                                   require_calibrated_profile: bool=False) -> Dict[str,Any]:
    if not explicit_accept:
        raise PermissionError("explicit_accept=True is required")
    gate=evaluate_master_gate(report,True,require_calibrated_profile)
    if not gate["eligible"]:
        raise ValueError("candidate is not eligible: "+",".join(gate["blocking_reasons"]))
    src=Path(candidate_path).resolve(); dst=Path(destination_path).resolve()
    if src==dst: raise ValueError("destination must be a new master path")
    if dst.exists(): raise FileExistsError("refusing to overwrite an existing master")
    dst.parent.mkdir(parents=True,exist_ok=True)
    copy2(src,dst)
    return {"accepted":True,"gate":gate,"source_sha256":sha256_file(str(src)),
            "new_master":asset_record(str(dst),"ready_to_print_master")}
