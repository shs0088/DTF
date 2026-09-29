import { describe, expect, test } from "bun:test";
import {
  evaluateOcrConsensus,
  ocrTextSimilarity,
} from "../src/ocr-consensus";

describe("OCR consensus", () => {
  test("passes when independent local engines agree on Arabic text", () => {
    const result = evaluateOcrConsensus([
      { engineId: "paddleocr", text: "اطبع حلمك", confidence: 0.96 },
      { engineId: "tesseract", text: "اطبع حلمك", confidence: 0.91 },
      { engineId: "easyocr", text: "اطبع حلمك", confidence: 0.9 },
    ]);
    expect(result.status).toBe("pass");
    expect(result.representativeText).toBe("اطبع حلمك");
  });

  test("requires review when one Arabic letter changes between engines", () => {
    const result = evaluateOcrConsensus([
      { engineId: "paddleocr", text: "اطبع حلمك", confidence: 0.96 },
      { engineId: "tesseract", text: "اطبع حلك", confidence: 0.92 },
    ]);
    expect(result.status).toBe("review");
    expect(result.reasons.join(" ")).toContain("disagree");
  });

  test("does not treat low-confidence agreement as proof", () => {
    const result = evaluateOcrConsensus([
      { engineId: "paddleocr", text: "PRINT YOUR DREAM", confidence: 0.6 },
      { engineId: "tesseract", text: "PRINT YOUR DREAM", confidence: 0.7 },
    ]);
    expect(result.status).toBe("review");
    expect(result.reliableReadings.length).toBe(0);
  });

  test("normalizes Unicode compatibility forms but not different letters", () => {
    expect(ocrTextSimilarity("ＡＢＣ", "ABC")).toBe(1);
    expect(ocrTextSimilarity("حلمك", "حلك")).toBeLessThan(1);
  });
});
