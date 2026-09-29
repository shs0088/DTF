import type {
  PreflightCheck,
  PreflightInput,
  PreflightResult,
  TopologySnapshot,
} from "./contracts";
import {
  MAX_SOURCE_BYTES,
  SUPPORTED_RASTER_FORMATS,
  SUPPORTED_VECTOR_OR_DOCUMENT_FORMATS,
  normalizeFormat,
} from "./rules";

const round = (value: number) => Math.round(value * 100) / 100;

export function effectiveDpi(
  pixelWidth: number,
  pixelHeight: number,
  widthIn: number,
  heightIn: number,
) {
  if (pixelWidth <= 0 || pixelHeight <= 0 || widthIn <= 0 || heightIn <= 0) return null;
  const x = pixelWidth / widthIn;
  const y = pixelHeight / heightIn;
  return { x: round(x), y: round(y), minimum: round(Math.min(x, y)) };
}

export function requiredUpscaleFactor(minimumEffectiveDpi: number, targetDpi: number) {
  if (minimumEffectiveDpi <= 0 || targetDpi <= 0) return null;
  return round(Math.max(1, targetDpi / minimumEffectiveDpi));
}

function levenshtein(a: string, b: string): number {
  const x = [...a.normalize("NFKC")];
  const y = [...b.normalize("NFKC")];
  const row = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const saved = row[j];
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = saved;
    }
  }
  return row[y.length];
}

export function textPreservationRatio(before: string, after: string): number {
  const a = before.trim();
  const b = after.trim();
  const denominator = Math.max([...a].length, [...b].length, 1);
  return round(1 - levenshtein(a, b) / denominator);
}

function topologyChanged(a?: TopologySnapshot, b?: TopologySnapshot): boolean {
  if (!a || !b) return false;
  const componentChanged =
    a.connectedComponents != null &&
    b.connectedComponents != null &&
    a.connectedComponents !== b.connectedComponents;
  const holesChanged = a.holes != null && b.holes != null && a.holes !== b.holes;
  return componentChanged || holesChanged;
}

export function runPreflight(input: PreflightInput): PreflightResult {
  const checks: PreflightCheck[] = [];
  const facts = input.facts;
  const profile = input.profile;
  const format = normalizeFormat(facts.format);
  const supported =
    SUPPORTED_RASTER_FORMATS.has(format) ||
    SUPPORTED_VECTOR_OR_DOCUMENT_FORMATS.has(format);

  checks.push({
    code: "format",
    status: supported ? "pass" : "fail",
    message: supported ? `Supported source format: ${format}.` : `Unsupported source format: ${format}.`,
  });

  checks.push({
    code: "byte-size",
    status: facts.byteSize > 0 && facts.byteSize <= MAX_SOURCE_BYTES ? "pass" : "fail",
    message:
      facts.byteSize <= 0
        ? "Source file is empty."
        : facts.byteSize > MAX_SOURCE_BYTES
          ? "Source exceeds the 100 MB prepress limit."
          : "Source byte size is valid.",
  });

  const dpi = effectiveDpi(
    facts.pixelWidth,
    facts.pixelHeight,
    input.intent.widthIn,
    input.intent.heightIn,
  );

  if (!dpi) {
    checks.push({
      code: "effective-dpi",
      status: "fail",
      message: "Pixel dimensions and physical print size are required.",
    });
  } else if (dpi.minimum < profile.criticalDpi) {
    checks.push({
      code: "effective-dpi",
      status: "fail",
      message: `Effective DPI ${dpi.minimum} is below critical minimum ${profile.criticalDpi}.`,
    });
  } else if (dpi.minimum < profile.targetDpi) {
    checks.push({
      code: "effective-dpi",
      status: "warn",
      message: `Effective DPI ${dpi.minimum} is below target ${profile.targetDpi}; a validated upscale candidate is required.`,
    });
  } else {
    checks.push({
      code: "effective-dpi",
      status: "pass",
      message: `Effective DPI ${dpi.minimum} meets target ${profile.targetDpi}.`,
    });
  }

  const scaleFactor = dpi ? requiredUpscaleFactor(dpi.minimum, profile.targetDpi) : null;
  if (scaleFactor != null && scaleFactor > profile.maxUpscaleFactor) {
    checks.push({
      code: "upscale-limit",
      status: "fail",
      message: `Required upscale factor ${scaleFactor}× exceeds profile maximum ${profile.maxUpscaleFactor}×.`,
    });
  } else if (scaleFactor != null && scaleFactor > 1) {
    checks.push({
      code: "upscale-limit",
      status: "warn",
      message: `Candidate requires approximately ${scaleFactor}× enlargement and must pass structural QA.`,
    });
  } else if (scaleFactor != null) {
    checks.push({ code: "upscale-limit", status: "pass", message: "No enlargement is required." });
  }

  const semiRatio = facts.alpha.semiTransparentRatio;
  if (semiRatio > 0) {
    const excessive = semiRatio >= profile.semiTransparencyReviewThreshold;
    if (profile.alphaHandlingMode === "binary-edge") {
      checks.push({
        code: "semi-transparency",
        status: "warn",
        message:
          "This RIP profile expects binary print edges. Create a separate edge-hardening candidate and compare it against the original; never overwrite soft effects silently.",
      });
    } else if (!profile.allowSemiTransparency) {
      checks.push({
        code: "semi-transparency",
        status: "fail",
        message: "Semi-transparent pixels are not allowed by this RIP profile.",
      });
    } else if (profile.alphaHandlingMode === "rip-adaptive") {
      checks.push({
        code: "semi-transparency",
        status: excessive ? "warn" : "pass",
        message: excessive
          ? `Semi-transparency ratio ${round(semiRatio * 100)}% requires RIP-specific print review because white underbase may follow opacity.`
          : "Semi-transparency is retained for RIP-adaptive alpha handling.",
      });
    } else {
      checks.push({
        code: "semi-transparency",
        status: excessive ? "warn" : "pass",
        message: excessive
          ? `Semi-transparency ratio ${round(semiRatio * 100)}% exceeds the continuous-alpha review threshold.`
          : "Continuous alpha is preserved by this profile.",
      });
    }
  } else {
    checks.push({ code: "semi-transparency", status: "pass", message: "No semi-transparent pixels detected." });
  }

  checks.push({
    code: "white-underbase",
    status: profile.bakeWhiteUnderbase ? "fail" : "pass",
    message: profile.bakeWhiteUnderbase
      ? "Master artwork must not bake a white underbase."
      : `White underbase remains a derived ${profile.underbaseStrategy} operation, not part of the master artwork.`,
  });

  if (facts.colorSpace && facts.colorSpace.toLowerCase() !== profile.preferredColorSpace) {
    checks.push({
      code: "color-space",
      status: "warn",
      message: `Source color space is ${facts.colorSpace}; derived candidates should be normalized to sRGB while preserving the original source and its profile metadata.`,
    });
  } else {
    checks.push({ code: "color-space", status: "pass", message: "Color space is compatible with the profile." });
  }

  const evidence = input.evidence;
  if (evidence?.ocrBefore && evidence?.ocrAfter) {
    const ratio = textPreservationRatio(evidence.ocrBefore.text, evidence.ocrAfter.text);
    checks.push({
      code: "text-preservation",
      status: ratio === 1 ? "pass" : ratio >= 0.98 ? "warn" : "fail",
      message: `OCR text preservation ratio: ${round(ratio * 100)}%.`,
    });
  }

  if (topologyChanged(evidence?.topologyBefore, evidence?.topologyAfter)) {
    checks.push({
      code: "topology",
      status: "fail",
      message: "Connected-component or hole topology changed after processing.",
    });
  }

  if (evidence?.colorDeltaE00 != null) {
    checks.push({
      code: "color-delta",
      status: evidence.colorDeltaE00 <= 2 ? "pass" : evidence.colorDeltaE00 <= 5 ? "warn" : "fail",
      message: `Measured color change ΔE00 = ${round(evidence.colorDeltaE00)}.`,
    });
  }

  if (evidence?.edgeDisplacementPx != null) {
    checks.push({
      code: "edge-displacement",
      status: evidence.edgeDisplacementPx <= 1 ? "pass" : evidence.edgeDisplacementPx <= 2 ? "warn" : "fail",
      message: `Measured edge displacement = ${round(evidence.edgeDisplacementPx)} px.`,
    });
  }

  if (evidence?.alphaFringeScore != null) {
    checks.push({
      code: "alpha-fringe",
      status: evidence.alphaFringeScore <= 0.02 ? "pass" : evidence.alphaFringeScore <= 0.05 ? "warn" : "fail",
      message: `Measured alpha fringe score = ${round(evidence.alphaFringeScore)}.`,
    });
  }

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  return {
    ruleVersion: "dtf-image-prepress-v1.0",
    effectiveDpi: dpi,
    scaleFactorRequired: scaleFactor,
    decision: hasFail ? "rejected" : hasWarn ? "review" : "accepted",
    checks,
  };
}
