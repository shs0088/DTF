import type { ProcessingPlan, RoutingSignals } from "./contracts";

export function buildProcessingPlan(signals: RoutingSignals): ProcessingPlan {
  const stages: string[] = ["decode-and-measure"];
  const forbiddenStages: string[] = [];
  const reasons: string[] = [];
  let requiresHumanReview = false;

  if (signals.kind === "already-print-ready") {
    stages.push("deterministic-preflight", "multi-background-preview");
    forbiddenStages.push("generative-restoration", "semantic-background-removal", "automatic-vectorization");
    reasons.push("Source is already print-ready; avoid unnecessary destructive processing.");
    return { kind: signals.kind, stages, forbiddenStages, requiresHumanReview, reasons };
  }

  if (signals.textDetected || signals.kind === "text-heavy" || signals.kind === "mixed") {
    stages.push("ocr-baseline");
    forbiddenStages.push("unconstrained-generative-text-restoration");
    reasons.push("Detected text must be preserved exactly and re-checked after processing.");
  }

  if (signals.backgroundPresent) {
    stages.push("foreground-segmentation", "alpha-matting", "foreground-color-decontamination");
    reasons.push("Background removal requires a matte plus foreground color reconstruction, not a binary mask only.");
  }

  if (signals.kind === "logo-line-art") {
    stages.push("vector-candidate");
    forbiddenStages.push("photo-face-restoration");
    reasons.push("Line art should prefer vector reconstruction before raster super-resolution.");
  } else if (signals.kind === "text-heavy") {
    if ((signals.vectorLikelihood ?? 0) >= 0.6) stages.push("vector-candidate");
    stages.push("text-safe-raster-candidate");
  } else if (signals.kind === "photo") {
    if ((signals.blurScore ?? 0) > 0.5) stages.push("deblur-candidate");
    if ((signals.jpegArtifactScore ?? 0) > 0.5) stages.push("artifact-reduction-candidate");
    stages.push("photo-super-resolution-candidate");
    if (signals.facesDetected) stages.push("face-local-restoration-candidate");
  } else {
    stages.push("protected-region-split", "raster-candidate");
    requiresHumanReview = true;
    reasons.push("Mixed artwork requires protected-region handling and review.");
  }

  stages.push(
    "effective-dpi-check",
    "ocr-and-topology-qa",
    "edge-and-alpha-qa",
    "color-delta-qa",
    "multi-background-preview",
    "deterministic-preflight",
  );

  return { kind: signals.kind, stages, forbiddenStages, requiresHumanReview, reasons };
}
