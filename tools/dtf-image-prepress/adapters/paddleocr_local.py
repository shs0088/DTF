#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

def absolute_existing(path_value: str, label: str) -> Path:
    path = Path(path_value)
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute local path")
    if not path.exists():
        raise ValueError(f"{label} does not exist: {path}")
    return path

def absolute_output(path_value: str, label: str) -> Path:
    path = Path(path_value)
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute local path")
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def offline_environment_required() -> None:
    required = {
        "HF_HUB_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_DATASETS_OFFLINE": "1",
        "PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK": "1",
    }
    missing = [key for key, expected in required.items() if os.environ.get(key) != expected]
    if missing:
        raise RuntimeError(
            "Offline PaddleOCR wrapper requires these environment flags: "
            + ", ".join(missing)
        )

def jsonable(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    return value

def main() -> int:
    parser = argparse.ArgumentParser(description="Local-only PaddleOCR wrapper")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--det-model-dir", required=True)
    parser.add_argument("--rec-model-dir", required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--rec-score-thresh", type=float, default=0.0)
    args = parser.parse_args()

    offline_environment_required()

    input_path = absolute_existing(args.input, "input")
    det_model_dir = absolute_existing(args.det_model_dir, "detection model directory")
    rec_model_dir = absolute_existing(args.rec_model_dir, "recognition model directory")
    output_json = absolute_output(args.output_json, "output JSON")

    if not 0.0 <= args.rec_score_thresh <= 1.0:
        raise ValueError("--rec-score-thresh must be between 0 and 1")

    # Import only after offline policy and local paths are validated.
    from paddleocr import PaddleOCR

    pipeline = PaddleOCR(
        text_detection_model_dir=str(det_model_dir),
        text_recognition_model_dir=str(rec_model_dir),
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device=args.device,
        text_rec_score_thresh=args.rec_score_thresh,
    )

    pages = []
    for result in pipeline.predict(str(input_path)):
        raw = jsonable(result.json)
        payload = raw.get("res", raw)
        texts = list(payload.get("rec_texts", []))
        scores = [float(v) for v in payload.get("rec_scores", [])]
        boxes = jsonable(payload.get("rec_boxes", []))
        polys = jsonable(payload.get("rec_polys", []))
        detection_scores = [float(v) for v in payload.get("dt_scores", [])]

        pages.append(
            {
                "texts": texts,
                "scores": scores,
                "boxes": boxes,
                "polys": polys,
                "detection_scores": detection_scores,
            }
        )

    normalized = {
        "engine": "paddleocr",
        "input": str(input_path),
        "pages": pages,
    }
    output_json.write_text(
        json.dumps(normalized, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"paddleocr-local-error: {exc}", file=sys.stderr)
        raise SystemExit(2)
