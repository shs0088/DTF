import sharp from "sharp";
import type { ArtworkKind } from "./contracts";

export interface ArtworkDiagnosticFeatures {
  entropy: number;
  sharpness: number;
  quantizedColorBins: number;
  quantizedColorDiversity: number;
  dominantBinRatio: number;
  edgeDensity: number;
  transparentRatio: number;
  semiTransparentRatio: number;
  ocrCoverageRatio?: number;
  textDetected?: boolean;
}

export interface ArtworkClassification {
  kind: Exclude<ArtworkKind, "already-print-ready">;
  confidence: number;
  reasons: string[];
  features: ArtworkDiagnosticFeatures;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

export function classifyArtworkFeatures(
  features: ArtworkDiagnosticFeatures,
): ArtworkClassification {
  const reasons: string[] = [];
  const textCoverage = features.ocrCoverageRatio ?? 0;

  if (features.textDetected && textCoverage >= 0.22) {
    const confidence = clamp01(0.72 + Math.min(0.25, textCoverage * 0.5));
    reasons.push(
      `Detected text covers approximately ${round(textCoverage * 100)}% of analyzed artwork.`,
    );
    return { kind: "text-heavy", confidence: round(confidence), reasons, features };
  }

  const lineArtSignal =
    features.quantizedColorDiversity <= 0.08 &&
    features.edgeDensity >= 0.035 &&
    features.entropy <= 6.2;

  if (lineArtSignal) {
    const colorStrength = clamp01((0.08 - features.quantizedColorDiversity) / 0.08);
    const edgeStrength = clamp01(features.edgeDensity / 0.15);
    const confidence = 0.55 + 0.2 * colorStrength + 0.2 * edgeStrength;
    reasons.push("Low color diversity with clear edge structure suggests logo/line-art artwork.");
    return {
      kind: "logo-line-art",
      confidence: round(clamp01(confidence)),
      reasons,
      features,
    };
  }

  const photoSignal =
    features.entropy >= 5.2 &&
    features.quantizedColorDiversity >= 0.12 &&
    features.dominantBinRatio <= 0.35;

  if (photoSignal) {
    const entropyStrength = clamp01((features.entropy - 5.2) / 2.5);
    const colorStrength = clamp01((features.quantizedColorDiversity - 0.12) / 0.35);
    const confidence = 0.58 + 0.18 * entropyStrength + 0.18 * colorStrength;
    reasons.push("High entropy and broad color diversity suggest photographic/raster artwork.");
    return {
      kind: "photo",
      confidence: round(clamp01(confidence)),
      reasons,
      features,
    };
  }

  reasons.push("Signals are mixed or weak; conservative mixed-artwork routing is safer.");
  return {
    kind: "mixed",
    confidence: 0.5,
    reasons,
    features,
  };
}

export async function diagnoseArtwork(
  sourcePath: string,
  options: { ocrCoverageRatio?: number; textDetected?: boolean } = {},
): Promise<ArtworkClassification> {
  const source = sharp(sourcePath, { failOn: "warning" }).autoOrient();
  const statsBuffer = await source.clone().toBuffer();
  const stats = await sharp(statsBuffer).stats();

  const { data, info } = await source
    .clone()
    .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });

  const bins = new Map<number, number>();
  let opaqueLike = 0;
  let transparent = 0;
  let semi = 0;
  let edgeCount = 0;
  let edgeTests = 0;
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const gray = new Uint8Array(width * height);
  const alpha = new Uint8Array(width * height);

  for (let i = 0, pixel = 0; i < data.length; i += channels, pixel++) {
    const r = data[i];
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const a = data[i + channels - 1];
    alpha[pixel] = a;
    gray[pixel] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

    if (a === 0) {
      transparent++;
      continue;
    }
    if (a < 255) semi++;
    if (a >= 32) {
      opaqueLike++;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      bins.set(key, (bins.get(key) ?? 0) + 1);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (alpha[index] < 32) continue;
      const center = gray[index];
      if (x + 1 < width && alpha[index + 1] >= 32) {
        edgeTests++;
        if (Math.abs(center - gray[index + 1]) >= 32) edgeCount++;
      }
      if (y + 1 < height && alpha[index + width] >= 32) {
        edgeTests++;
        if (Math.abs(center - gray[index + width]) >= 32) edgeCount++;
      }
    }
  }

  let dominantCount = 0;
  for (const count of bins.values()) dominantCount = Math.max(dominantCount, count);

  const totalPixels = Math.max(1, width * height);
  const features: ArtworkDiagnosticFeatures = {
    entropy: round(stats.entropy),
    sharpness: round(stats.sharpness),
    quantizedColorBins: bins.size,
    quantizedColorDiversity: round(bins.size / Math.max(1, Math.min(opaqueLike, 32768))),
    dominantBinRatio: round(dominantCount / Math.max(1, opaqueLike)),
    edgeDensity: round(edgeCount / Math.max(1, edgeTests)),
    transparentRatio: round(transparent / totalPixels),
    semiTransparentRatio: round(semi / totalPixels),
    ocrCoverageRatio: options.ocrCoverageRatio,
    textDetected: options.textDetected,
  };

  return classifyArtworkFeatures(features);
}
