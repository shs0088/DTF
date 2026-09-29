import { describe, expect, test } from "bun:test";
import { buildProcessingPlan } from "../src/router";

describe("processing router", () => {
  test("text-heavy artwork forbids unconstrained generative text restoration", () => {
    const plan = buildProcessingPlan({
      kind: "text-heavy",
      backgroundPresent: true,
      textDetected: true,
      vectorLikelihood: 0.8,
    });
    expect(plan.stages).toContain("ocr-baseline");
    expect(plan.stages).toContain("vector-candidate");
    expect(plan.stages).toContain("alpha-matting");
    expect(plan.forbiddenStages).toContain("unconstrained-generative-text-restoration");
  });

  test("already print-ready artwork avoids destructive processing", () => {
    const plan = buildProcessingPlan({
      kind: "already-print-ready",
      backgroundPresent: false,
    });
    expect(plan.stages).toEqual(["decode-and-measure", "deterministic-preflight", "multi-background-preview"]);
    expect(plan.forbiddenStages).toContain("generative-restoration");
  });
});
