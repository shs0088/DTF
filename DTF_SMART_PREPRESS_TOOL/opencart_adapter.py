from __future__ import annotations
from typing import Dict,Any
from pipeline import inspect_master

ALLOWED_PRODUCT_TYPES={
 "T-Shirt","Mug","Cap","T-Shirt+Mug","T-Shirt+Cap","Mug+Cap","T-Shirt+Mug+Cap"
}

def evaluate_order_item(artwork_path:str,order_item_id:str|int,product_type:str,
                        print_width_in:float,print_height_in:float,
                        print_area_width_in:float,print_area_height_in:float,
                        master_selected:bool,
                        output_profile_path:str|None=None,
                        require_calibrated_profile:bool=False)->Dict[str,Any]:
    contract_findings=[]
    if product_type not in ALLOWED_PRODUCT_TYPES:
        contract_findings.append({"severity":"FAIL","code":"INVALID_PRODUCT_TYPE",
          "message":"Product type is outside the configured DTF Studio combinations."})
    if not master_selected:
        contract_findings.append({"severity":"FAIL","code":"MASTER_NOT_EXPLICITLY_SELECTED",
          "message":"Ready-to-Print Master must be explicitly selected for the order item."})

    report=inspect_master(
        artwork_path,print_width_in,print_height_in,
        output_profile_path=output_profile_path,
        require_calibrated_profile=require_calibrated_profile,
        print_area_width_in=print_area_width_in,
        print_area_height_in=print_area_height_in
    )
    preflight_eligible=(report.get("master_gate") or {}).get("eligible",False)
    contract_ok=not any(x["severity"]=="FAIL" for x in contract_findings)
    eligible=contract_ok and preflight_eligible
    return {
      "contract_version":"0.1",
      "order_item_id":str(order_item_id),
      "product_type":product_type,
      "master_selected":bool(master_selected),
      "preflight_status":report.get("status"),
      "preflight_master_gate":report.get("master_gate"),
      "contract_findings":contract_findings,
      "ready_to_print_eligible":eligible,
      "blocking_reasons":[x["code"] for x in contract_findings if x["severity"]=="FAIL"]+
                         ([] if preflight_eligible else ["PREFLIGHT_MASTER_GATE_BLOCKED"]),
      "report":report,
      "note":"This adapter evaluates eligibility only. It does not change OpenCart orders, statuses, or storefront data."
    }
