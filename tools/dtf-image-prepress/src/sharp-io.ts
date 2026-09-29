import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { AlphaMetrics, ImageFacts } from "./contracts";

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

export async function sha256File(path: string): Promise<string> {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

export async function inspectRaster(path: string): Promise<ImageFacts> {
  const image = sharp(path, { failOn: "warning" });
  const metadata = await image.metadata();
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparent = 0;
  let semi = 0;
  let opaque = 0;
  const channels = info.channels;
  const alphaIndex = channels - 1;
  for (let i = alphaIndex; i < data.length; i += channels) {
    const a = data[i];
    if (a === 0) transparent++;
    else if (a === 255) opaque++;
    else semi++;
  }
  const total = Math.max(1, transparent + semi + opaque);
  const alpha: AlphaMetrics = {
    hasAlpha: metadata.hasAlpha ?? false,
    transparentRatio: clampRatio(transparent / total),
    semiTransparentRatio: clampRatio(semi / total),
    opaqueRatio: clampRatio(opaque / total),
  };

  const density = metadata.density ?? null;
  return {
    format: metadata.format ?? "unknown",
    byteSize: (await readFile(path)).byteLength,
    pixelWidth: metadata.width ?? 0,
    pixelHeight: metadata.height ?? 0,
    embeddedDpi: density,
    colorSpace: metadata.space ?? null,
    hasIccProfile: Boolean(metadata.icc),
    alpha,
  };
}

export interface DerivedCandidateOptions {
  widthIn: number;
  heightIn: number;
  targetDpi: number;
  allowUpscale: boolean;
}

export async function writeSafeRgbaCandidate(
  sourcePath: string,
  outputPath: string,
  options: DerivedCandidateOptions,
) {
  const targetWidth = Math.round(options.widthIn * options.targetDpi);
  const targetHeight = Math.round(options.heightIn * options.targetDpi);
  const metadata = await sharp(sourcePath).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  const enlarging = targetWidth > sourceWidth || targetHeight > sourceHeight;

  if (enlarging && !options.allowUpscale) {
    throw new Error("Upscaling is disabled for this candidate. Route the source through a validated upscaler first.");
  }

  await sharp(sourcePath, { failOn: "warning" })
    .ensureAlpha()
    .toColourspace("srgb")
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: "inside",
      withoutEnlargement: !options.allowUpscale,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .withMetadata({ density: options.targetDpi })
    .toFile(outputPath);

  return { targetWidth, targetHeight, outputPath };
}

export async function writePreviewOnBackground(
  sourcePath: string,
  outputPath: string,
  background: { r: number; g: number; b: number },
) {
  await sharp(sourcePath)
    .ensureAlpha()
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  return outputPath;
}
