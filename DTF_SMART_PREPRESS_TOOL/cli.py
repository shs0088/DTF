import argparse,json
from pipeline import inspect_master
from white_underbase import generate_white_preview
from topology import compare_masks
from mockup_derivative import make_mockup_derivative
from background import border_connected_color_key
from edge_decontamination import unmatte_known_background
from image_ops import extend_hidden_rgb, resize_rgba_premultiplied_linear, denoise_derivative, sharpen_derivative
from halftone import ordered_bayer_preview

def _rgb(s):
    p=[int(x) for x in s.split(",")]
    if len(p)!=3 or any(x<0 or x>255 for x in p): raise argparse.ArgumentTypeError("use R,G,B")
    return tuple(p)

def main():
    p=argparse.ArgumentParser(prog="dtf-prepress")
    p.add_argument("image")
    p.add_argument("--width-in",type=float,required=True); p.add_argument("--height-in",type=float,required=True)
    p.add_argument("--choke-mm",type=float,default=0.0); p.add_argument("--spread-mm",type=float,default=0.0)
    p.add_argument("--min-stroke-mm",type=float); p.add_argument("--min-island-area-mm2",type=float)
    p.add_argument("--report"); p.add_argument("--white-preview"); p.add_argument("--mockup-preview")
    p.add_argument("--bg-candidate"); p.add_argument("--bg-tolerance",type=float,default=24.0)
    p.add_argument("--edge-bleed"); p.add_argument("--edge-bleed-iterations",type=int,default=8)
    p.add_argument("--known-bg-decontam"); p.add_argument("--known-bg-rgb",type=_rgb)
    p.add_argument("--resize-out"); p.add_argument("--resize-width",type=int); p.add_argument("--resize-height",type=int)
    p.add_argument("--denoise-out"); p.add_argument("--sharpen-out"); p.add_argument("--halftone-preview")
    args=p.parse_args()

    report=inspect_master(args.image,args.width_in,args.height_in,args.choke_mm,args.spread_mm,
                          args.min_stroke_mm,args.min_island_area_mm2)
    if report["status"]=="FAIL" and "security" in report and not report["security"].get("ok",True):
        print(json.dumps(report,indent=2)); raise SystemExit(2)

    dpi=report["effective_dpi"]["minimum"]
    if args.white_preview:
        report["white_preview"]=generate_white_preview(args.image,args.white_preview,dpi,args.choke_mm,args.spread_mm)
        report["white_topology_comparison"]=compare_masks(args.image,args.white_preview)
        c=report["white_topology_comparison"]
        if c["components_lost"] or c["holes_lost"]:
            report["findings"].append({"severity":"FAIL","code":"WHITE_TOPOLOGY_LOSS",
              "message":"White-mask generation removed components or holes/counters."}); report["status"]="FAIL"
    if args.mockup_preview: report["mockup_derivative"]=make_mockup_derivative(args.image,args.mockup_preview)
    if args.bg_candidate: report["background_candidate"]=border_connected_color_key(args.image,args.bg_candidate,args.bg_tolerance)
    if args.edge_bleed: report["edge_bleed"]=extend_hidden_rgb(args.image,args.edge_bleed,args.edge_bleed_iterations)
    if args.known_bg_decontam:
        if args.known_bg_rgb is None: p.error("--known-bg-decontam requires --known-bg-rgb R,G,B")
        report["edge_decontamination"]=unmatte_known_background(args.image,args.known_bg_decontam,args.known_bg_rgb)
    if args.resize_out:
        if not args.resize_width or not args.resize_height: p.error("--resize-out requires --resize-width and --resize-height")
        report["resize"]=resize_rgba_premultiplied_linear(args.image,args.resize_out,(args.resize_width,args.resize_height))
    if args.denoise_out: report["denoise"]=denoise_derivative(args.image,args.denoise_out)
    if args.sharpen_out: report["sharpen"]=sharpen_derivative(args.image,args.sharpen_out)
    if args.halftone_preview: report["halftone_preview"]=ordered_bayer_preview(args.image,args.halftone_preview)

    payload=json.dumps(report,indent=2,ensure_ascii=False)
    if args.report: open(args.report,"w",encoding="utf-8").write(payload+"\n")
    print(payload)

if __name__=="__main__": main()
