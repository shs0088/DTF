from pathlib import Path
from PIL import Image

def make_mockup_derivative(master_path: str, output_path: str, max_side: int=1600) -> dict:
    """Creates a preview derivative; never overwrites the authoritative master."""
    src=Path(master_path).resolve(); dst=Path(output_path).resolve()
    if src==dst:
        raise ValueError("Mockup derivative must not overwrite the Ready-to-Print Master")
    im=Image.open(src).convert("RGBA")
    original=im.size
    im.thumbnail((max_side,max_side),Image.Resampling.LANCZOS)
    im.save(dst,"PNG")
    return {"master_unchanged":True,"source_size":original,"derivative_size":im.size,"output":str(dst)}
