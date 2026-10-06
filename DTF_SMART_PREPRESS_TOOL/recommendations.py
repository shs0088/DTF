from typing import Dict,Any

def build_recommendations(report:Dict[str,Any])->list[dict]:
    rec=[]
    findings=report.get("findings") or []
    codes={x.get("code") for x in findings}
    px=report.get("pixel_analysis") or {}
    edge=report.get("edge_quality") or {}
    geom=report.get("geometry") or {}

    if "NO_ALPHA" in codes:
        rec.append({"priority":"high","action":"background_candidate",
                    "reason":"Artwork has no source alpha. Inspect background before any automatic removal.",
                    "automatic":False})
    if "LOW_ALPHA" in codes:
        rec.append({"priority":"high","action":"low_alpha_review",
                    "reason":"Low-alpha pixels may be intentional soft edges or contamination; classify before white generation.",
                    "automatic":False})
    if edge.get("edge_pixels_evaluated",0)>0 and edge.get("rgb_deviation_p95",0)>0.35:
        rec.append({"priority":"medium","action":"edge_decontamination_review",
                    "reason":"Semi-transparent edge RGB differs strongly from nearby opaque foreground. Review on multiple backgrounds.",
                    "automatic":False})
    if "EFFECTIVE_DPI_BELOW_PROFILE" in codes:
        rec.append({"priority":"high","action":"upscale_candidate",
                    "reason":"Effective DPI is below the configured output profile. Upscaling may improve raster density but cannot restore missing source detail.",
                    "automatic":False})
    if "NON_UNIFORM_SCALE" in codes or geom.get("aspect_distortion_percent",0)>1:
        rec.append({"priority":"high","action":"preserve_aspect_ratio",
                    "reason":"Requested physical size distorts the source aspect ratio.",
                    "automatic":False})
    if "FEATURE_LOSS" in codes or "FEATURE_BELOW_PROFILE" in codes:
        rec.append({"priority":"high","action":"reduce_choke_or_review_feature",
                    "reason":"Fine features are at risk under the current physical-size/output-profile settings.",
                    "automatic":False})
    if px.get("semi_transparent_ratio",0)>0:
        rec.append({"priority":"medium","action":"preserve_continuous_alpha",
                    "reason":"Soft alpha is present; do not binarize unless the output policy explicitly requires it.",
                    "automatic":False})
    return rec
