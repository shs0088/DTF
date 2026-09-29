import sharp from "sharp";
import { DEFAULT_INPUT_SECURITY_POLICY } from "./input-security";

export interface TileSeamFeatures {
  width: number;
  height: number;
  seamSpacingX: number;
  seamSpacingY: number;
  verticalSeamCount: number;
  horizontalSeamCount: number;
  seamMeanDifference: number;
  neighborMeanDifference: number;
  normalizedExcess: number;
  ratio: number;
}

export interface TileSeamCalibration {
  id: string;
  sourceCorpusSha256: string;
  maximumNormalizedExcess: number;
  maximumRatio: number;
}

export interface TileSeamAssessment {
  status: "pass" | "review";
  automaticSignalAllowed: boolean;
  reasons: string[];
  calibrationId?: string;
  features: TileSeamFeatures;
}

const round = (value: number) => Math.round(value * 100000) / 100000;

function validCalibration(calibration: TileSeamCalibration): boolean {
  return (
    /^[a-f0-9]{64}$/i.test(calibration.sourceCorpusSha256) &&
    calibration.maximumNormalizedExcess >= 0 &&
    calibration.maximumRatio >= 1
  );
}

export async function measureTileSeams(input: {
  imagePath: string;
  tileSizeInputPx: number;
  scale: number;
}): Promise<TileSeamFeatures> {
  if (!Number.isInteger(input.tileSizeInputPx) || input.tileSizeInputPx <= 0) {
    throw new Error("tileSizeInputPx must be a positive integer.");
  }
  if (!Number.isFinite(input.scale) || input.scale <= 0) {
    throw new Error("scale must be positive and finite.");
  }

  const { data, info } = await sharp(input.imagePath, {
    failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
    limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
    limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
    unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
    sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
    pages: 1,
  })
    .autoOrient()
    .toColourspace("b-w")
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 1) throw new Error("Tile seam analysis requires one grayscale channel.");

  const width = info.width;
  const height = info.height;
  const seamSpacingX = Math.max(1, Math.round(input.tileSizeInputPx * input.scale));
  const seamSpacingY = seamSpacingX;

  let seamSum = 0;
  let seamSamples = 0;
  let neighborSum = 0;
  let neighborSamples = 0;
  let verticalSeamCount = 0;
  let horizontalSeamCount = 0;

  const pixel = (x: number, y: number) => data[y * width + x];

  for (let x = seamSpacingX; x < width; x += seamSpacingX) {
    if (x < 2 || x + 1 >= width) continue;
    verticalSeamCount++;
    for (let y = 0; y < height; y++) {
      seamSum += Math.abs(pixel(x - 1, y) - pixel(x, y));
      seamSamples++;
      neighborSum += Math.abs(pixel(x - 2, y) - pixel(x - 1, y));
      neighborSum += Math.abs(pixel(x, y) - pixel(x + 1, y));
      neighborSamples += 2;
    }
  }

  for (let y = seamSpacingY; y < height; y += seamSpacingY) {
    if (y < 2 || y + 1 >= height) continue;
    horizontalSeamCount++;
    for (let x = 0; x < width; x++) {
      seamSum += Math.abs(pixel(x, y - 1) - pixel(x, y));
      seamSamples++;
      neighborSum += Math.abs(pixel(x, y - 2) - pixel(x, y - 1));
      neighborSum += Math.abs(pixel(x, y) - pixel(x, y + 1));
      neighborSamples += 2;
    }
  }

  const seamMean = seamSum / Math.max(1, seamSamples) / 255;
  const neighborMean = neighborSum / Math.max(1, neighborSamples) / 255;
  const normalizedExcess = Math.max(0, seamMean - neighborMean);
  const ratio =
    neighborMean <= 1e-6
      ? seamMean <= 1e-6
        ? 1
        : Number.POSITIVE_INFINITY
      : seamMean / neighborMean;

  return {
    width,
    height,
    seamSpacingX,
    seamSpacingY,
    verticalSeamCount,
    horizontalSeamCount,
    seamMeanDifference: round(seamMean),
    neighborMeanDifference: round(neighborMean),
    normalizedExcess: round(normalizedExcess),
    ratio: Number.isFinite(ratio) ? round(ratio) : ratio,
  };
}

export function assessTileSeams(
  features: TileSeamFeatures,
  calibration?: TileSeamCalibration,
): TileSeamAssessment {
  if (features.verticalSeamCount + features.horizontalSeamCount === 0) {
    return {
      status: "review",
      automaticSignalAllowed: false,
      reasons: ["No internal tile boundaries are present in the output; seam metric is not applicable."],
      features,
      calibrationId: calibration?.id,
    };
  }

  if (!calibration) {
    return {
      status: "review",
      automaticSignalAllowed: false,
      reasons: [
        "No fingerprinted tile-seam calibration is installed; seam metrics are informational only.",
      ],
      features,
    };
  }

  if (!validCalibration(calibration)) {
    return {
      status: "review",
      automaticSignalAllowed: false,
      reasons: ["Tile-seam calibration is invalid."],
      features,
      calibrationId: calibration.id,
    };
  }

  const reasons: string[] = [];
  if (features.normalizedExcess > calibration.maximumNormalizedExcess) {
    reasons.push("Tile boundary excess exceeds calibrated limit.");
  }
  if (features.ratio > calibration.maximumRatio) {
    reasons.push("Tile boundary difference ratio exceeds calibrated limit.");
  }

  return {
    status: reasons.length === 0 ? "pass" : "review",
    automaticSignalAllowed: true,
    reasons,
    features,
    calibrationId: calibration.id,
  };
}
