import argparse, json
from image_analysis import analyze_pixels
from preflight import ImageFacts, OutputProfile, analyze
from white_underbase import generate_white_preview

def main():
    p=argparse.ArgumentParser(prog="dtf-prepress")
    p.add_argument("image")
    p.add_argument("--width-in",type=float,required=True)
    p.add_argument("--height-in",type=float,required=True)
    p.add_argument("--choke-mm",type=float,default=0.0)
    p.add_argument("--spread-mm",type=float,default=0.0)
    p.add_argument("--white-preview")
    p.add_argument("--report")
    args=p.parse_args()

    px=analyze_pixels(args.image)
    facts=ImageFacts(px["width_px"],px["height_px"],args.width_in,args.height_in,
                     px["has_alpha"],px["semi_transparent_ratio"],px["low_alpha_ratio"],
                     px["min_run_px"])
    profile=OutputProfile("cli",args.choke_mm,args.spread_mm)
    report=analyze(facts,profile)
    report["pixel_analysis"]=px
    if args.white_preview:
        report["white_preview"]=generate_white_preview(
            args.image,args.white_preview,report["effective_dpi"]["minimum"],
            args.choke_mm,args.spread_mm)
    payload=json.dumps(report,indent=2,ensure_ascii=False)
    if args.report:
        open(args.report,"w",encoding="utf-8").write(payload+"\n")
    print(payload)

if __name__=="__main__":
    main()
