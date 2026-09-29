import { describe, expect, test } from "bun:test";
import { planLocalPipeline } from "../src/local-pipeline-planner";

const installed = [
  { providerId: "sharp", verified: true },
  { providerId: "paddleocr-ppocrv5-arabic", modelFormat: "onnx", verified: true },
  { providerId: "tesseract-ocr-arabic", verified: true },
  { providerId: "birefnet-hr-matting", modelFormat: "onnx", verified: true },
  { providerId: "ben", modelFormat: "onnx", verified: true },
  { providerId: "pymatting", verified: true },
  { providerId: "opencv-guided-filter", verified: true },
  { providerId: "vtracer", verified: true },
  { providerId: "resvg", verified: true },
  { providerId: "real-esrgan", modelFormat: "onnx", verified: true },
  { providerId: "swinir", modelFormat: "onnx", verified: true },
  { providerId: "littlecms", verified: true },
  // Research-only provider must never appear even if someone marks it installed.
  { providerId: "cloudinary-background-removal", verified: true },
];

describe("local pipeline planner", () => {
  test("difficult text artwork uses local OCR and multi-mask consensus", () => {
    const plan = planLocalPipeline({
      routing: {
        kind: "text-heavy",
        backgroundPresent: true,
        textDetected: true,
        foregroundSharesBackgroundColor: true,
        lowContrastBoundary: true,
      },
      installed,
      hardware: ["cpu"],
    });
    expect(plan.localOnly).toBe(true);
    expect(plan.requiresMaskConsensus).toBe(true);
    expect(plan.steps.filter((step) => step.role === "ocr").length).toBeGreaterThanOrEqual(2);
    expect(plan.steps.filter((step) => step.role === "mask-proposal").length).toBeGreaterThanOrEqual(2);
    expect(plan.steps.map((step) => step.providerId)).not.toContain(
      "cloudinary-background-removal",
    );
  });

  test("photo route proposes local raster restorers but no vectorizer", () => {
    const plan = planLocalPipeline({
      routing: {
        kind: "photo",
        backgroundPresent: false,
        blurScore: 0.7,
      },
      installed: [
        ...installed,
        { providerId: "restormer", modelFormat: "onnx", verified: true },
      ],
      hardware: ["cpu"],
    });
    expect(plan.steps.some((step) => step.providerId === "restormer")).toBe(true);
    expect(plan.steps.some((step) => step.providerId === "real-esrgan")).toBe(true);
    expect(plan.steps.some((step) => step.providerId === "vtracer")).toBe(false);
  });

  test("unverified model is excluded", () => {
    const plan = planLocalPipeline({
      routing: {
        kind: "photo",
        backgroundPresent: false,
      },
      installed: [
        { providerId: "sharp", verified: true },
        { providerId: "real-esrgan", modelFormat: "onnx", verified: false },
      ],
      hardware: ["cpu"],
    });
    expect(plan.steps.some((step) => step.providerId === "real-esrgan")).toBe(false);
  });
});
