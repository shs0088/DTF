from pathlib import Path
from typing import Dict, Any
from PIL import Image

ALLOWED={"PNG","TIFF","WEBP","JPEG"}

def validate_upload(path: str, max_encoded_mb: int=50, max_megapixels: int=80) -> Dict[str,Any]:
    p=Path(path); size=p.stat().st_size
    if size>max_encoded_mb*1024*1024:
        return {"ok":False,"code":"ENCODED_SIZE_LIMIT","bytes":size}
    try:
        with Image.open(path) as im:
            fmt=(im.format or "").upper(); w,h=im.size
            if fmt not in ALLOWED:
                return {"ok":False,"code":"FORMAT_NOT_ALLOWED","format":fmt}
            mp=w*h/1_000_000
            if mp>max_megapixels:
                return {"ok":False,"code":"DECODED_PIXEL_LIMIT","megapixels":round(mp,3)}
            im.verify()
    except Image.DecompressionBombError:
        return {"ok":False,"code":"DECOMPRESSION_BOMB"}
    except Exception as e:
        return {"ok":False,"code":"IMAGE_PARSE_FAILED","error":type(e).__name__}
    return {"ok":True,"format":fmt,"width_px":w,"height_px":h,"megapixels":round(mp,3),"bytes":size}
