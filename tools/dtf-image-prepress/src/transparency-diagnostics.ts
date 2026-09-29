import sharp from "sharp";
import { DEFAULT_INPUT_SECURITY_POLICY } from "./input-security";

export interface TransparencyDiagnosticReport {
  sampledWidth: number;
  sampledHeight: number;
  fullyTransparentPixels: number;
  transparentPixelsWithRgb: number;
  transparentRgbNonzeroRatio: number;
  averageTransparentRgbEnergy: number;
  semiTransparentPixels: number;
  semiTransparentRatio: number;
  note: string;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

export async function diagnoseTransparencyRgb(
  sourcePath: string,
): Promise<TransparencyDiagnosticReport> {
  const { data, info } = await sharp(sourcePath, {
    failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
    limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
    limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
    unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
    sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
    pages: 1,
  })
    .autoOrient()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let fullyTransparentPixels = 0;
  let transparentPixelsWithRgb = 0;
  let transparentRgbEnergyTotal = 0;
  let semiTransparentPixels = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const a = data[i + channels - 1] ?? 255;

    if (a === 0) {
      fullyTransparentPixels++;
      const energy = (r + g + b) / (3 * 255);
      transparentRgbEnergyTotal += energy;
      if (r !== 0 || g !== 0 || b !== 0) transparentPixelsWithRgb++;
    } else if (a < 255) {
      semiTransparentPixels++;
    }
  }

  const total = Math.max(1, info.width * info.height);
  return {
    sampledWidth: info.width,
    sampledHeight: info.height,
    fullyTransparentPixels,
    transparentPixelsWithRgb,
    transparentRgbNonzeroRatio: round(
      transparentPixelsWithRgb / Math.max(1, fullyTransparentPixels),
    ),
    averageTransparentRgbEnergy: round(
      transparentRgbEnergyTotal / Math.max(1, fullyTransparentPixels),
    ),
    semiTransparentPixels,
    semiTransparentRatio: round(semiTransparentPixels / total),
    note:
      "Hidden RGB in fully transparent pixels is diagnostic evidence only. It is never deleted from the source automatically; derived resize/filter paths must remain alpha-aware and halo QA is performed separately.",
  };
}
