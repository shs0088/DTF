import sharp from "sharp";
import { DEFAULT_INPUT_SECURITY_POLICY } from "./input-security";

export interface BorderBackgroundFeatures {
  width: number;
  height: number;
  borderSamples: number;
  dominantBorderColor: { r: number; g: number; b: number } | null;
  dominantBorderRatio: number;
  transparentBorderRatio: number;
  cornerAgreementRatio: number;
  meanDistanceFromDominant: number | null;
}

export interface BorderBackgroundCalibration {
  id: string;
  sourceCorpusSha256: string;
  minimumDominantBorderRatio: number;
  minimumCornerAgreementRatio: number;
  maximumMeanDistanceFromDominant: number;
}

export interface BorderBackgroundAssessment {
  status: "already-transparent" | "uniform-border-candidate" | "review";
  automaticSignalAllowed: boolean;
  reasons: string[];
  features: BorderBackgroundFeatures;
  calibrationId?: string;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function quantKey(r: number, g: number, b: number): number {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
}

function keyColor(key: number) {
  return {
    r: ((key >> 8) & 0xf) * 17,
    g: ((key >> 4) & 0xf) * 17,
    b: (key & 0xf) * 17,
  };
}

function distance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.sqrt(
    (a.r - b.r) ** 2 +
    (a.g - b.g) ** 2 +
    (a.b - b.b) ** 2,
  );
}

export async function measureBorderBackground(
  sourcePath: string,
): Promise<BorderBackgroundFeatures> {
  const { data, info } = await sharp(sourcePath, {
    failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
    limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
    limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
    unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
    sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
    pages: 1,
  })
    .autoOrient()
    .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const borderThickness = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) / 16)));
  const bins = new Map<number, number>();
  const samples: Array<{ r: number; g: number; b: number; a: number; x: number; y: number }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder =
        x < borderThickness ||
        y < borderThickness ||
        x >= width - borderThickness ||
        y >= height - borderThickness;
      if (!isBorder) continue;
      const index = (y * width + x) * channels;
      const r = data[index] ?? 0;
      const g = data[index + 1] ?? r;
      const b = data[index + 2] ?? r;
      const a = data[index + channels - 1] ?? 255;
      samples.push({ r, g, b, a, x, y });
      if (a >= 32) {
        const key = quantKey(r, g, b);
        bins.set(key, (bins.get(key) ?? 0) + 1);
      }
    }
  }

  let dominantKey: number | null = null;
  let dominantCount = 0;
  for (const [key, count] of bins) {
    if (count > dominantCount) {
      dominantKey = key;
      dominantCount = count;
    }
  }

  const transparentCount = samples.filter((sample) => sample.a < 32).length;
  const opaqueSamples = Math.max(1, samples.length - transparentCount);
  const dominantColor = dominantKey == null ? null : keyColor(dominantKey);

  let meanDistance: number | null = null;
  if (dominantColor) {
    const opaque = samples.filter((sample) => sample.a >= 32);
    meanDistance =
      opaque.reduce(
        (sum, sample) => sum + distance(sample, dominantColor),
        0,
      ) / Math.max(1, opaque.length);
  }

  const cornerRadius = Math.max(1, borderThickness * 2);
  const corners = samples.filter((sample) => {
    const left = sample.x < cornerRadius;
    const right = sample.x >= width - cornerRadius;
    const top = sample.y < cornerRadius;
    const bottom = sample.y >= height - cornerRadius;
    return (left || right) && (top || bottom);
  });

  const cornerAgreement =
    dominantKey == null
      ? 0
      : corners.filter(
          (sample) =>
            sample.a >= 32 &&
            quantKey(sample.r, sample.g, sample.b) === dominantKey,
        ).length / Math.max(1, corners.filter((sample) => sample.a >= 32).length);

  return {
    width,
    height,
    borderSamples: samples.length,
    dominantBorderColor: dominantColor,
    dominantBorderRatio: round(dominantCount / opaqueSamples),
    transparentBorderRatio: round(transparentCount / Math.max(1, samples.length)),
    cornerAgreementRatio: round(cornerAgreement),
    meanDistanceFromDominant: meanDistance == null ? null : round(meanDistance),
  };
}

export function assessBorderBackground(
  features: BorderBackgroundFeatures,
  calibration?: BorderBackgroundCalibration,
): BorderBackgroundAssessment {
  const reasons: string[] = [];

  if (features.transparentBorderRatio >= 0.95) {
    return {
      status: "already-transparent",
      automaticSignalAllowed: true,
      reasons: ["At least 95% of sampled border pixels are already transparent."],
      features,
      calibrationId: calibration?.id,
    };
  }

  if (!calibration) {
    reasons.push(
      "No calibrated border-background thresholds are installed; metrics are informational only.",
    );
    return {
      status: "review",
      automaticSignalAllowed: false,
      reasons,
      features,
    };
  }

  if (!/^[a-f0-9]{64}$/i.test(calibration.sourceCorpusSha256)) {
    reasons.push("Calibration corpus fingerprint is invalid.");
    return {
      status: "review",
      automaticSignalAllowed: false,
      reasons,
      features,
      calibrationId: calibration.id,
    };
  }

  const uniform =
    features.dominantBorderRatio >= calibration.minimumDominantBorderRatio &&
    features.cornerAgreementRatio >= calibration.minimumCornerAgreementRatio &&
    features.meanDistanceFromDominant != null &&
    features.meanDistanceFromDominant <= calibration.maximumMeanDistanceFromDominant;

  if (uniform) {
    reasons.push("Border uniformity passes the installed calibrated thresholds.");
    return {
      status: "uniform-border-candidate",
      automaticSignalAllowed: true,
      reasons,
      features,
      calibrationId: calibration.id,
    };
  }

  reasons.push("Border measurements do not pass calibrated uniform-background thresholds.");
  return {
    status: "review",
    automaticSignalAllowed: true,
    reasons,
    features,
    calibrationId: calibration.id,
  };
}
