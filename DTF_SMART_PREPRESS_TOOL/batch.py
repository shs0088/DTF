from __future__ import annotations
from typing import Iterable,Dict,Any
from pipeline import inspect_master

def analyze_batch(items:Iterable[tuple[str,str]],width_in:float,height_in:float,
                  choke_mm:float=0.0,spread_mm:float=0.0,**kwargs)->Dict[str,Any]:
    results=[]; counts={"PASS":0,"WARN":0,"FAIL":0}
    for display_name,path in items:
        try:
            report=inspect_master(path,width_in,height_in,choke_mm,spread_mm,**kwargs)
        except Exception as e:
            report={"status":"FAIL","findings":[{"severity":"FAIL","code":"BATCH_ITEM_EXCEPTION",
                    "message":f"{type(e).__name__}: {e}"}]}
        status=report.get("status","FAIL")
        counts[status]=counts.get(status,0)+1
        results.append({"name":display_name,"status":status,"report":report})
    return {"count":len(results),"summary":counts,"items":results}
