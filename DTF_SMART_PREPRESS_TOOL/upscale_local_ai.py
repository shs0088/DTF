from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from PIL import Image
import subprocess

def realesrgan_ncnn_candidate(input_path:str,output_path:str,executable_path:str,
                              model_name:str="realesrgan-x4plus",scale:int=4,
                              timeout_seconds:int=300)->Dict[str,Any]:
    """Run a preinstalled local Real-ESRGAN NCNN executable. No network calls are made."""
    exe=Path(executable_path).resolve()
    if not exe.is_file(): raise FileNotFoundError(f"local Real-ESRGAN executable missing: {exe}")
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("AI upscale must create a derivative")
    if scale not in (2,3,4): raise ValueError("scale must be 2, 3, or 4")
    before=Image.open(src).convert("RGBA")
    cmd=[str(exe),"-i",str(src),"-o",str(dst),"-n",model_name,"-s",str(scale)]
    cp=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout_seconds,shell=False)
    if cp.returncode!=0:
        raise RuntimeError(f"Real-ESRGAN failed with code {cp.returncode}: {cp.stderr[-1000:]}")
    if not dst.is_file(): raise RuntimeError("Real-ESRGAN did not create the requested output")
    after=Image.open(dst).convert("RGBA")
    expected=(before.width*scale,before.height*scale)
    dimension_match=(after.size==expected)
    return {"output":str(dst),"backend":"realesrgan-ncnn-vulkan","model":model_name,
            "scale":scale,"network_required":False,"expected_size_px":list(expected),
            "actual_size_px":list(after.size),"dimension_match":dimension_match,
            "source_unchanged":True,
            "warning":"AI upscaling increases raster size but does not prove recovery of missing source detail; run edge/detail QA."}
