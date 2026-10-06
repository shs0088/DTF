from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
from PIL import Image
import json,struct

GLB_MAGIC=0x46546C67
JSON_CHUNK=0x4E4F534A

def _inspect_gltf_json(data:dict)->Dict[str,Any]:
    asset=data.get("asset") or {}
    meshes=data.get("meshes") or []
    nodes=data.get("nodes") or []
    scenes=data.get("scenes") or []
    return {
      "asset_version":asset.get("version"),
      "mesh_count":len(meshes),
      "node_count":len(nodes),
      "scene_count":len(scenes),
      "actual_3d":len(meshes)>0,
      "supports_animation":bool(data.get("animations")),
      "animation_count":len(data.get("animations") or [])
    }

def inspect_mockup_asset(path:str)->Dict[str,Any]:
    p=Path(path); suffix=p.suffix.lower()
    if suffix in (".png",".jpg",".jpeg",".webp",".tif",".tiff"):
        try:
            with Image.open(p) as im:
                im.verify()
            return {"kind":"2d_image","actual_3d":False,"format":suffix.lstrip("."),
                    "reason":"Raster image is a 2D mockup/preview asset."}
        except Exception as e:
            return {"kind":"invalid","actual_3d":False,"error":f"{type(e).__name__}: {e}"}

    if suffix==".gltf":
        try:
            data=json.loads(p.read_text(encoding="utf-8"))
            r=_inspect_gltf_json(data)
            return {"kind":"gltf",**r,
                    "reason":"Validated glTF JSON with mesh data." if r["actual_3d"] else "glTF container has no mesh data."}
        except Exception as e:
            return {"kind":"invalid_gltf","actual_3d":False,"error":f"{type(e).__name__}: {e}"}

    if suffix==".glb":
        try:
            raw=p.read_bytes()
            if len(raw)<20: raise ValueError("GLB too short")
            magic,version,total=struct.unpack_from("<III",raw,0)
            if magic!=GLB_MAGIC: raise ValueError("invalid GLB magic")
            if total!=len(raw): raise ValueError("GLB declared length does not match file size")
            chunk_len,chunk_type=struct.unpack_from("<II",raw,12)
            if chunk_type!=JSON_CHUNK: raise ValueError("first GLB chunk is not JSON")
            if 20+chunk_len>len(raw): raise ValueError("GLB JSON chunk exceeds file length")
            text=raw[20:20+chunk_len].decode("utf-8").rstrip(" \t\r\n\x00")
            data=json.loads(text)
            r=_inspect_gltf_json(data)
            return {"kind":"glb","glb_version":version,**r,
                    "reason":"Validated binary glTF with mesh data." if r["actual_3d"] else "GLB container has no mesh data."}
        except Exception as e:
            return {"kind":"invalid_glb","actual_3d":False,"error":f"{type(e).__name__}: {e}"}

    if suffix==".obj":
        try:
            vertices=0; faces=0
            with p.open("r",encoding="utf-8",errors="ignore") as f:
                for line in f:
                    s=line.lstrip()
                    if s.startswith("v "): vertices+=1
                    elif s.startswith("f "): faces+=1
            actual=vertices>=3 and faces>=1
            return {"kind":"obj","actual_3d":actual,"vertex_count":vertices,"face_count":faces,
                    "reason":"OBJ contains vertices and faces." if actual else "OBJ lacks sufficient vertex/face geometry."}
        except Exception as e:
            return {"kind":"invalid_obj","actual_3d":False,"error":f"{type(e).__name__}: {e}"}

    return {"kind":"unsupported","actual_3d":False,"extension":suffix,
            "reason":"Asset type is not structurally validated as 3D by this build."}
