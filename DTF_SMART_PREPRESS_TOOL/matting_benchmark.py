from __future__ import annotations
from typing import Iterable,Dict,Any
from matting_metrics import compare_alpha_mattes

def benchmark_candidates(reference_path:str,candidates:Iterable[tuple[str,str]])->Dict[str,Any]:
    rows=[]
    for name,path in candidates:
        m=compare_alpha_mattes(reference_path,path)
        rows.append({"name":name,"path":path,"metrics":m})
    rows.sort(key=lambda x:(x["metrics"]["sad_mean"],x["metrics"]["gradient_mae"]))
    return {
      "count":len(rows),
      "ranking_metric":"sad_mean then gradient_mae",
      "candidates":rows,
      "winner":rows[0]["name"] if rows else None,
      "note":"Benchmark ranking is only against the supplied ground-truth alpha and does not replace print-condition QA."
    }
