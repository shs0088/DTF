import sharp from "sharp";
import {
  evaluateMaskConsensus,
  type AlphaMaskReading,
  type MaskConsensusPolicy,
  type MaskConsensusResult,
} from "./mask-consensus";
import { DEFAULT_INPUT_SECURITY_POLICY } from "./input-security";

export interface LocalMaskCandidateFile {
  providerId: string;
  maskPath: string;
}

export interface LocalMaskComparisonReport {
  width: number;
  height: number;
  candidates: Array<{
    providerId: string;
    maskPath: string;
    meanAlpha: number;
    semiTransparentRatio: number;
  }>;
  consensus: MaskConsensusResult;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

async function readMask(
  candidate: LocalMaskCandidateFile,
  analysisWidth: number,
  analysisHeight: number,
): Promise<{
  reading: AlphaMaskReading;
  meanAlpha: number;
  semiTransparentRatio: number;
}> {
  const { data, info } = await sharp(candidate.maskPath, {
    failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
    limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
    limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
    unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
    sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
    pages: 1,
  })
    .autoOrient()
    .resize({
      width: analysisWidth,
      height: analysisHeight,
      fit: "fill",
      kernel: sharp.kernel.bilinear,
    })
    .toColourspace("b-w")
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 1) {
    throw new Error(`Mask from ${candidate.providerId} did not decode to one grayscale channel.`);
  }

  let sum = 0;
  let semi = 0;
  for (const value of data) {
    sum += value;
    if (value > 0 && value < 255) semi++;
  }

  const alpha = Uint8Array.from(data);
  return {
    reading: {
      providerId: candidate.providerId,
      alpha,
      width: info.width,
      height: info.height,
    },
    meanAlpha: round(sum / Math.max(1, data.length) / 255),
    semiTransparentRatio: round(semi / Math.max(1, data.length)),
  };
}

export async function compareLocalMaskCandidates(input: {
  candidates: LocalMaskCandidateFile[];
  policy?: MaskConsensusPolicy;
  analysisMaxDimension?: number;
}): Promise<LocalMaskComparisonReport> {
  if (input.candidates.length === 0) {
    throw new Error("At least one local mask candidate is required.");
  }
  const maxDimension = input.analysisMaxDimension ?? 512;
  if (!Number.isInteger(maxDimension) || maxDimension < 64 || maxDimension > 2048) {
    throw new Error("analysisMaxDimension must be an integer between 64 and 2048.");
  }

  const firstMeta = await sharp(input.candidates[0].maskPath, {
    failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
    limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
    limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
    unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
    sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
    pages: 1,
  }).metadata();

  const sourceWidth = firstMeta.width ?? 0;
  const sourceHeight = firstMeta.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Mask dimensions are unavailable.");
  }

  // Require all providers to have restored the mask to the same source-space
  // dimensions before consensus. Downsampling is only for efficient comparison.
  for (const candidate of input.candidates.slice(1)) {
    const meta = await sharp(candidate.maskPath, {
      failOn: DEFAULT_INPUT_SECURITY_POLICY.failOn,
      limitInputPixels: DEFAULT_INPUT_SECURITY_POLICY.maxPixels,
      limitInputChannels: DEFAULT_INPUT_SECURITY_POLICY.maxChannels,
      unlimited: DEFAULT_INPUT_SECURITY_POLICY.unlimited,
      sequentialRead: DEFAULT_INPUT_SECURITY_POLICY.sequentialRead,
      pages: 1,
    }).metadata();
    if (meta.width !== sourceWidth || meta.height !== sourceHeight) {
      throw new Error(
        `Mask source-space dimensions differ: ${candidate.providerId} is ${meta.width}x${meta.height}, expected ${sourceWidth}x${sourceHeight}.`,
      );
    }
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const loaded = [];
  for (const candidate of input.candidates) {
    loaded.push(await readMask(candidate, width, height));
  }

  return {
    width,
    height,
    candidates: loaded.map((item, index) => ({
      providerId: item.reading.providerId,
      maskPath: input.candidates[index].maskPath,
      meanAlpha: item.meanAlpha,
      semiTransparentRatio: item.semiTransparentRatio,
    })),
    consensus: evaluateMaskConsensus(
      loaded.map((item) => item.reading),
      input.policy,
    ),
  };
}
