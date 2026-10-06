import io
from typing import Dict, Any
from PIL import Image, ImageCms

def inspect_color(path: str) -> Dict[str,Any]:
    im=Image.open(path)
    raw=im.info.get("icc_profile")
    result={"mode":im.mode,"embedded_icc":bool(raw),"icc_bytes":len(raw) if raw else 0}
    if raw:
        try:
            p=ImageCms.ImageCmsProfile(io.BytesIO(raw))
            result["icc_description"]=ImageCms.getProfileDescription(p).strip()
            result["icc_info"]=ImageCms.getProfileInfo(p).strip()
        except Exception as e:
            result["icc_parse_error"]=type(e).__name__
    else:
        result["warning"]="No embedded ICC profile; do not assume this proves a specific working/output color space."
    return result

def output_fingerprint(profile_id: str, printer: str|None=None, ink_set: str|None=None,
                       film_media: str|None=None, rip: str|None=None, print_mode: str|None=None,
                       icc_revision: str|None=None, screening: str|None=None,
                       white_policy: str|None=None) -> Dict[str,Any]:
    return {"profile_id":profile_id,"printer":printer,"ink_set":ink_set,"film_media":film_media,
            "rip":rip,"print_mode":print_mode,"icc_revision":icc_revision,
            "screening":screening,"white_policy":white_policy}
