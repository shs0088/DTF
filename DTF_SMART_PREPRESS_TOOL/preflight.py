from dataclasses import dataclass,asdict
from typing import Optional,List,Dict,Any

@dataclass
class ImageFacts:
    width_px:int
    height_px:int
    print_width_in:float
    print_height_in:float
    has_alpha:bool
    semi_transparent_ratio:float=0.0
    low_alpha_ratio:float=0.0
    min_feature_px:Optional[float]=None

@dataclass
class OutputProfile:
    profile_id:str
    choke_mm:float=0.0
    spread_mm:float=0.0
    min_feature_mm:Optional[float]=None
    white_source_mode:str="generated"
    min_effective_dpi:Optional[float]=None
    max_aspect_distortion_percent:float=1.0

def effective_dpi(px:int,inches:float)->float:
    if inches<=0: raise ValueError("Final physical size must be positive")
    return px/inches

def mm_to_px(mm:float,dpi:float)->float:
    return (mm/25.4)*dpi

def analyze(image:ImageFacts,profile:OutputProfile)->Dict[str,Any]:
    xdpi=effective_dpi(image.width_px,image.print_width_in)
    ydpi=effective_dpi(image.height_px,image.print_height_in)
    dpi=min(xdpi,ydpi)
    findings:List[Dict[str,str]]=[]

    pixel_aspect=image.width_px/image.height_px
    print_aspect=image.print_width_in/image.print_height_in
    aspect_distortion=abs(print_aspect/pixel_aspect-1.0)*100.0
    if aspect_distortion>profile.max_aspect_distortion_percent:
        findings.append({"severity":"WARN","code":"NON_UNIFORM_SCALE",
          "message":"Requested physical size changes the artwork aspect ratio."})

    if profile.min_effective_dpi is not None and dpi<profile.min_effective_dpi:
        findings.append({"severity":"FAIL","code":"EFFECTIVE_DPI_BELOW_PROFILE",
          "message":"Effective DPI is below the configured output-profile threshold."})

    if not image.has_alpha:
        findings.append({"severity":"WARN","code":"NO_ALPHA","message":"No source transparency channel detected."})
    if image.low_alpha_ratio>0:
        findings.append({"severity":"WARN","code":"LOW_ALPHA",
          "message":"Low-alpha pixels require intent classification before white generation."})
    if image.semi_transparent_ratio>0:
        findings.append({"severity":"INFO","code":"SOFT_ALPHA",
          "message":"Preserve continuous alpha unless a calibrated output rule requires thresholding."})

    choke_px=mm_to_px(profile.choke_mm,dpi); spread_px=mm_to_px(profile.spread_mm,dpi)

    if image.min_feature_px is not None and profile.choke_mm>0:
        remaining=image.min_feature_px-(2.0*choke_px)
        if remaining<=0:
            findings.append({"severity":"FAIL","code":"FEATURE_LOSS",
              "message":"Configured choke can erase the measured minimum feature."})

    if profile.min_feature_mm is not None and image.min_feature_px is not None:
        actual_mm=image.min_feature_px/dpi*25.4
        if actual_mm<profile.min_feature_mm:
            findings.append({"severity":"FAIL","code":"FEATURE_BELOW_PROFILE",
              "message":"Measured feature is below the configured physical printability threshold."})

    status="FAIL" if any(x["severity"]=="FAIL" for x in findings) else ("WARN" if any(x["severity"]=="WARN" for x in findings) else "PASS")
    return {
      "schema_version":"0.4","status":status,
      "effective_dpi":{"x":round(xdpi,2),"y":round(ydpi,2),"minimum":round(dpi,2)},
      "geometry":{"pixel_aspect_ratio":round(pixel_aspect,6),"print_aspect_ratio":round(print_aspect,6),
                  "aspect_distortion_percent":round(aspect_distortion,4)},
      "white":{"source_mode":profile.white_source_mode,"choke_mm":profile.choke_mm,
               "choke_px":round(choke_px,3),"spread_mm":profile.spread_mm,"spread_px":round(spread_px,3)},
      "findings":findings,"input":asdict(image),"output_profile":asdict(profile)
    }
