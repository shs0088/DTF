from __future__ import annotations
from pathlib import Path
from typing import Iterable,Dict,Any
from PIL import Image,ImageDraw,ImageFont
import json,math

def _px(mm:float,dpi:float)->int:
    return max(1,int(round(mm/25.4*dpi)))

def generate_calibration_chart(output_png:str,output_json:str,dpi:int=300,
                               width_in:float=8.27,height_in:float=11.69,
                               stroke_widths_mm:Iterable[float]=(0.10,0.15,0.20,0.25,0.30,0.40,0.50,0.75,1.00),
                               island_diameters_mm:Iterable[float]=(0.20,0.30,0.40,0.50,0.75,1.00,1.50,2.00),
                               hole_diameters_mm:Iterable[float]=(0.20,0.30,0.40,0.50,0.75,1.00,1.50,2.00),
                               choke_values_mm:Iterable[float]=(0.00,0.05,0.10,0.15,0.20,0.25,0.30))->Dict[str,Any]:
    w=int(round(width_in*dpi)); h=int(round(height_in*dpi))
    im=Image.new("RGBA",(w,h),(255,255,255,255)); d=ImageDraw.Draw(im); font=ImageFont.load_default()
    margin=_px(10,dpi); y=margin
    d.text((margin,y),"DTF SMART PREPRESS CALIBRATION CHART",fill=(0,0,0,255),font=font); y+=_px(8,dpi)
    d.text((margin,y),f"DPI={dpi}  Page={width_in:.2f}x{height_in:.2f} in",fill=(0,0,0,255),font=font); y+=_px(12,dpi)

    def title(t):
        nonlocal y
        d.text((margin,y),t,fill=(0,0,0,255),font=font); y+=_px(6,dpi)

    title("STROKE WIDTHS (measure survival after full print/cure)")
    x=margin
    for mm in stroke_widths_mm:
        sw=_px(mm,dpi)
        d.rectangle((x,y,x+_px(12,dpi),y+_px(18,dpi)),outline=(180,180,180,255),width=1)
        d.line((x+_px(6,dpi),y+_px(3,dpi),x+_px(6,dpi),y+_px(13,dpi)),fill=(0,0,0,255),width=sw)
        d.text((x,y+_px(14,dpi)),f"{mm:.2f}mm",fill=(0,0,0,255),font=font)
        x+=_px(16,dpi)
        if x+_px(14,dpi)>w-margin:
            x=margin; y+=_px(22,dpi)
    y+=_px(24,dpi)

    title("ISLAND DIAMETERS")
    x=margin
    for mm in island_diameters_mm:
        dia=_px(mm,dpi)
        cx=x+_px(6,dpi); cy=y+_px(7,dpi)
        d.ellipse((cx-dia//2,cy-dia//2,cx+dia//2,cy+dia//2),fill=(0,0,0,255))
        d.text((x,y+_px(14,dpi)),f"{mm:.2f}",fill=(0,0,0,255),font=font)
        x+=_px(16,dpi)
    y+=_px(24,dpi)

    title("HOLE / COUNTER DIAMETERS")
    x=margin
    for mm in hole_diameters_mm:
        d.rectangle((x,y,x+_px(12,dpi),y+_px(12,dpi)),fill=(0,0,0,255))
        dia=_px(mm,dpi); cx=x+_px(6,dpi); cy=y+_px(6,dpi)
        d.ellipse((cx-dia//2,cy-dia//2,cx+dia//2,cy+dia//2),fill=(255,255,255,255))
        d.text((x,y+_px(14,dpi)),f"{mm:.2f}",fill=(0,0,0,255),font=font)
        x+=_px(16,dpi)
    y+=_px(24,dpi)

    title("CHOKE REFERENCE VALUES (configure equivalent RIP tests)")
    x=margin
    for mm in choke_values_mm:
        d.rectangle((x,y,x+_px(18,dpi),y+_px(10,dpi)),outline=(0,0,0,255),width=max(1,_px(0.2,dpi)))
        inset=_px(mm,dpi)
        if inset*2<_px(18,dpi):
            d.rectangle((x+inset,y+inset,x+_px(18,dpi)-inset,y+_px(10,dpi)-inset),fill=(0,0,0,255))
        d.text((x,y+_px(12,dpi)),f"{mm:.2f}mm",fill=(0,0,0,255),font=font)
        x+=_px(24,dpi)
        if x+_px(20,dpi)>w-margin:
            x=margin; y+=_px(20,dpi)

    y+=_px(26,dpi)
    d.text((margin,y),"Record results after actual printer/RIP/ink/film/print-mode output.",fill=(0,0,0,255),font=font)
    d.text((margin,y+_px(5,dpi)),"Do not infer universal DTF limits from this chart.",fill=(0,0,0,255),font=font)

    Path(output_png).parent.mkdir(parents=True,exist_ok=True)
    im.save(output_png,dpi=(dpi,dpi))
    manifest={
      "dpi":dpi,"page_inches":[width_in,height_in],
      "stroke_widths_mm":list(stroke_widths_mm),
      "island_diameters_mm":list(island_diameters_mm),
      "hole_diameters_mm":list(hole_diameters_mm),
      "choke_values_mm":list(choke_values_mm),
      "instructions":"Print through the exact production RIP/printer/ink/film/mode, then record physically observed survival and chosen settings."
    }
    Path(output_json).write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    return {"png":output_png,"manifest":output_json,**manifest}
