from pathlib import Path
from typing import Dict,Any
from PIL import Image,ImageCms

def convert_profile_derivative(input_path:str,output_path:str,destination_profile_path:str,
                               source_profile_path:str|None=None,rendering_intent:int=0)->Dict[str,Any]:
    """Explicit ICC conversion. Never silently assigns an output profile to untagged RGB."""
    src=Path(input_path).resolve(); dst=Path(output_path).resolve()
    if src==dst: raise ValueError("ICC conversion must create a derivative")
    im=Image.open(src).convert("RGBA"); alpha=im.getchannel("A"); rgb=im.convert("RGB")
    if source_profile_path:
        sp=ImageCms.getOpenProfile(source_profile_path); source_origin="explicit"
    else:
        raw=Image.open(src).info.get("icc_profile")
        if not raw: raise ValueError("Input has no embedded ICC; provide source_profile_path explicitly")
        import io
        sp=ImageCms.ImageCmsProfile(io.BytesIO(raw)); source_origin="embedded"
    dp=ImageCms.getOpenProfile(destination_profile_path)
    converted=ImageCms.profileToProfile(rgb,sp,dp,renderingIntent=rendering_intent,outputMode="RGB")
    out=converted.convert("RGBA"); out.putalpha(alpha)
    out.save(dst,icc_profile=dp.tobytes())
    return {"output":str(dst),"source_profile":source_origin,
            "destination_profile":ImageCms.getProfileDescription(dp).strip(),
            "rendering_intent":rendering_intent,"alpha_unchanged":True,
            "operation":"convert_profile","warning":"Assign Profile and Convert Profile are not interchangeable."}
