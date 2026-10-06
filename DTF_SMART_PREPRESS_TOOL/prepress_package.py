from __future__ import annotations
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Dict,Any
from zipfile import ZipFile,ZIP_DEFLATED
import json
from pipeline import inspect_master
from white_underbase import generate_white_preview
from mockup_derivative import make_mockup_derivative
from provenance import sha256_file

def create_prepress_package(source_path:str,output_zip:str,width_in:float,height_in:float,
                            choke_mm:float=0.0,spread_mm:float=0.0,
                            output_profile_path:str|None=None)->Dict[str,Any]:
    out=Path(output_zip).resolve()
    out.parent.mkdir(parents=True,exist_ok=True)
    report=inspect_master(source_path,width_in,height_in,choke_mm,spread_mm,
                          output_profile_path=output_profile_path)
    dpi=report.get("effective_dpi",{}).get("minimum")
    if not dpi: raise ValueError("effective DPI unavailable; cannot build package")

    with TemporaryDirectory(dir=str(out.parent)) as td:
        root=Path(td)
        report_path=root/"preflight-report.json"
        white_path=root/"white-preview.png"
        mockup_path=root/"mockup-preview.png"
        manifest_path=root/"package-manifest.json"
        readme_path=root/"README.txt"

        generate_white_preview(source_path,str(white_path),dpi,choke_mm,spread_mm)
        make_mockup_derivative(source_path,str(mockup_path),1200)
        report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        readme_path.write_text(
            "DTF Smart Prepress diagnostic handoff package\n"
            "- white-preview.png is diagnostic only, not authoritative RIP white output.\n"
            "- mockup-preview.png is a derivative and never replaces the Ready-to-Print Master.\n"
            "- preflight-report.json contains the analysis and master gate.\n"
            "- The source/master artwork is intentionally not embedded in this ZIP.\n",
            encoding="utf-8"
        )
        files=[report_path,white_path,mockup_path,readme_path]
        manifest={"source_sha256":sha256_file(source_path),"source_embedded":False,
                  "files":{p.name:sha256_file(str(p)) for p in files}}
        manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
        files.append(manifest_path)
        with ZipFile(out,"w",ZIP_DEFLATED) as z:
            for p in files: z.write(p,arcname=p.name)
    return {"output":str(out),"sha256":sha256_file(str(out)),"report_status":report.get("status"),
            "master_gate":report.get("master_gate"),"source_embedded":False}
