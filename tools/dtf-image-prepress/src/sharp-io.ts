import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import sharp from "sharp";
import type { AlphaMetrics, ImageFacts } from "./contracts";

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));
const ORIENTATION_SWAPS_AXES = new Set([5, 6, 7, 8]);

export async function sha256File(path: string): Promise<string> {
  const data = await Bun.file(path).arrayBuffer();
  return createHash("sha256").update(Buffer.from(data)).digest("hex");
}

function sha256Buffer(value?: Buffer): string | null {
  if (!value || value.byteLength === 0) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function inspectRaster(path: string): Promise<ImageFacts> {
  const image = sharp(path, { failOn: "warning" });
  const metadata = await image.metadata();

  const { data, info } = await image
    .clone()
    .autoOrient()
    .ensureAlpha()
    .raw({ depth: "uchar" })
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

  const orientation = metadata.orientation ?? null;
  const storedWidth = metadata.width ?? 0;
  const storedHeight = metadata.height ?? 0;
  const swapAxes = orientation != null && ORIENTATION_SWAPS_AXES.has(orientation);
  const fileStat = await stat(path);

  return {
    format: metadata.format ?? "unknown",
    byteSize: fileStat.size,
    pixelWidth: swapAxes ? storedHeight : storedWidth,
    pixelHeight: swapAxes ? storedWidth : storedHeight,
    embeddedDpi: metadata.density ?? null,
    colorSpace: metadata.space ?? null,
    hasIccProfile: Boolean(metadata.icc),
    iccSha256: sha256Buffer(metadata.icc),
    pixelDepth: metadata.depth ?? null,
    bitsPerSample: metadata.bitsPerSample ?? null,
    orientation,
    pages: metadata.pages ?? 1,
    pageHeight: metadata.pageHeight ?? null,
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
  const orientation = metadata.orientation ?? null;
  const swapAxes = orientation != null && ORIENTATION_SWAPS_AXES.has(orientation);
  const sourceWidth = swapAxes ? (metadata.height ?? 0) : (metadata.width ?? 0);
  const sourceHeight = swapAxes ? (metadata.width ?? 0) : (metadata.height ?? 0);
  const enlarging = targetWidth > sourceWidth || targetHeight > sourceHeight;

  if (enlarging && !options.allowUpscale) {
    throw new Error("Upscaling is disabled for this candidate. Route the source through a validated upscaler first.");
  }

  await sharp(sourcePath, { failOn: "warning" })
    .autoOrient()
    .ensureAlpha()
    .pipelineColourspace("rgb16")
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: "inside",
      withoutEnlargement: !options.allowUpscale,
      kernel: sharp.kernel.lanczos3,
    })
    .toColourspace("srgb")
    .withIccProfile("srgb")
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .withMetadata({ orientation: 1, density: options.targetDpi })
    .toFile(outputPath);

  return { targetWidth, targetHeight, outputPath };
}

export async function writePreviewOnBackground(
  sourcePath: string,
  outputPath: string,
  background: { r: number; g: number; b: number },
) {
  await sharp(sourcePath)
    .autoOrient()
    .ensureAlpha()
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  return outputPath;
}
