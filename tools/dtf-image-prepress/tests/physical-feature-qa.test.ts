import { describe, expect, test } from "bun:test";
import {
  evaluatePhysicalFeatures,
  pixelsToMillimeters,
} from "../src/physical-feature-qa";

describe("physical feature QA", () => {
  test("converts pixel strokes to physical millimeters using effective DPI", () => {
    expect(pixelsToMillimeters(3, 300)).toBeCloseTo(0.254, 3);
    expect(pixelsToMillimeters(3, 150)).toBeCloseTo(0.508, 3);
  });

  test("warns only against a named local printer calibration", () => {
    const result = evaluatePhysicalFeatures(
      { minimumStrokePx: 2, effectiveDpi: 300 },
      {
        id: "local-printer-cal-2026-09",
        printerProfileId: "printer-a-film-b-mode-1",
        minimumPrintableStrokeMm: 0.25,
        provenance: "local printed resolution/detail chart",
      },
    );
    expect(result.warnings.length).toBe(1);
    expect(result.calibrationId).toBe("local-printer-cal-2026-09");
  });

  test("does not embed an undocumented universal DTF minimum", () => {
    expect(() =>
      evaluatePhysicalFeatures(
        { minimumStrokePx: 2, effectiveDpi: 300 },
        {
          id: "bad",
          printerProfileId: "bad",
          minimumPrintableStrokeMm: 0,
          provenance: "none",
        },
      ),
    ).toThrow("positive printer calibration");
  });
});
