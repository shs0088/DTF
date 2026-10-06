from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from uuid import uuid4
from provenance import sha256_file,write_manifest
from asset_registry import AssetRegistry
from quality_metrics import compare_images
from topology import analyze_topology

class CandidateManager:
    def __init__(self,workdir:str="runtime_candidates",registry_db:str="runtime_assets.sqlite3"):
        self.workdir=Path(workdir); self.workdir.mkdir(parents=True,exist_ok=True)
        self.registry=AssetRegistry(registry_db)

    def path_for(self,stem:str,suffix:str=".png")->str:
        safe="".join(c for c in stem if c.isalnum() or c in ("-","_"))[:40] or "candidate"
        return str(self.workdir/f"{safe}-{uuid4().hex}{suffix}")

    def register_candidate(self,source_path:str,candidate_path:str,operation:str,
                           parameters:Dict[str,Any]|None=None,alpha_changed:bool=False)->Dict[str,Any]:
        parent=sha256_file(source_path)
        rec=self.registry.register(candidate_path,"derivative_candidate",parent,operation,parameters or {})
        qa={"fidelity":compare_images(source_path,candidate_path)}
        if alpha_changed:
            qa["source_topology"]=analyze_topology(source_path)
            qa["candidate_topology"]=analyze_topology(candidate_path)
            qa["component_delta"]=qa["candidate_topology"]["component_count"]-qa["source_topology"]["component_count"]
            qa["hole_delta"]=qa["candidate_topology"]["hole_count"]-qa["source_topology"]["hole_count"]
        manifest={"asset":rec,"qa":qa,"acceptance":"candidate_only_until_explicitly_accepted"}
        manifest_path=candidate_path+".manifest.json"
        write_manifest(manifest_path,manifest)
        return {"candidate":rec,"qa":qa,"manifest":manifest_path}
