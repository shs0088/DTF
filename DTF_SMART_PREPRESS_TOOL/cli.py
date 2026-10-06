import argparse, json
from image_analysis import analyze_pixels
from preflight import ImageFacts, OutputProfile, analyze
from white_underbase import generate_white_preview
from topology import analyze_topology, compare_masks
from security import validate_upload
from mockup_derivative import make_mockup_derivative

def main():
    p=argparse.ArgumentParser(prog="dtf-prepress")
    p.add_argument("image")
    p.add_argument("--width-in",type=float,required=True)
    p.add_argument("--height-in",type=float,required=True)
    p.add_argument("--choke-mm",type=float,default=0.0)
    p.add_argument("--spread-mm",type=float,default=0.0)
    p.add_argument("--white-preview")
    p.add_argument("--mockup-preview")
    p.add_argument("--report")
    args=p.parse_args()

    security=validate_upload(args.image)
    if not security["ok"]:
        print(json.dumps({"status":"FAIL","security":security},indent=2)); raise SystemExit(2)

    px=analyze_pixels(args.image)
    facts=ImageFacts(px["width_px"],px["height_px"],args.width_in,args.height_in,
                     px["has_alpha"],px["semi_transparent_ratio"],px["low_alpha_ratio"],
                     px["min_run_px"])
    profile=OutputProfile("cli",args.choke_mm,args.spread_mm)
    report=analyze(facts,profile)
    report["security"]=security
    report["pixel_analysis"]=px
    report["topology"]=analyze_topology(args.image)

    if args.white_preview:
        report["white_preview"]=generate_white_preview(
            args.image,args.white_preview,report["effective_dpi"]["minimum"],
            args.choke_mm,args.spread_mm)
        report["white_topology_comparison"]=compare_masks(args.image,args.white_preview)
        c=report["white_topology_comparison"]
        if c["components_lost"] or c["holes_lost"]:
            report["findings"].append({"severity":"FAIL","code":"WHITE_TOPOLOGY_LOSS",
              "message":"White-mask generation removed components or holes/counters."})
            report["status"]="FAIL"

    if args.mockup_preview:
        report["mockup_derivative"]=make_mockup_derivative(args.image,args.mockup_preview)

    payload=json.dumps(report,indent=2,ensure_ascii=False)
    if args.report:
        open(args.report,"w",encoding="utf-8").write(payload+"\n")
    print(payload)

if __name__=="__main__": main()
