import sharp from "sharp";

export interface RgbaCandidateDiff {
  alphaMae: number;
  edgeAlphaMae: number;
  edgeRgbMae: number;
  outsideLeakRatio: number;
  lostOpaqueRatio: number;
  edgePixelCount: number;
}

const round = (value: number) => Math.round(value * 100000) / 100000;

function isReferenceEdge(alpha: Uint8Array, width: number, height: number, index: number): boolean {
  const a = alpha[index];
  if (a > 0 && a < 255) return true;
  const x = index % width;
  const y = Math.floor(index / width);
  if (x > 0 && Math.abs(a - alpha[index - 1]) >= 16) return true;
  if (x + 1 < width && Math.abs(a - alpha[index + 1]) >= 16) return true;
  if (y > 0 && Math.abs(a - alpha[index - width]) >= 16) return true;
  if (y + 1 < height && Math.abs(a - alpha[index + width]) >= 16) return true;
  return false;
}

export function compareRgbaBuffers(input: {
  reference: Uint8Array;
  candidate: Uint8Array;
  width: number;
  height: number;
  channels?: 4;
}): RgbaCandidateDiff {
  const channels = input.channels ?? 4;
  const pixels = input.width * input.height;
  if (input.reference.length !== pixels * channels || input.candidate.length !== pixels * channels) {
    throw new Error("RGBA buffers must match width, height and channel count.");
  }

  const referenceAlpha = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel++) {
    referenceAlpha[pixel] = input.reference[pixel * channels + 3];
  }

  let alphaError = 0;
  let edgeAlphaError = 0;
  let edgeRgbError = 0;
  let edgePixelCount = 0;
  let transparentReference = 0;
  let outsideLeakPixels = 0;
  let opaqueReference = 0;
  let lostOpaquePixels = 0;

  for (let pixel = 0; pixel < pixels; pixel++) {
    const offset = pixel * channels;
    const ra = input.reference[offset + 3];
    const ca = input.candidate[offset + 3];
    alphaError += Math.abs(ra - ca) / 255;

    if (ra <= 4) {
      transparentReference++;
      if (ca >= 16) outsideLeakPixels++;
    }
    if (ra >= 251) {
      opaqueReference++;
      if (ca <= 239) lostOpaquePixels++;
    }

    if (isReferenceEdge(referenceAlpha, input.width, input.height, pixel)) {
      edgePixelCount++;
      edgeAlphaError += Math.abs(ra - ca) / 255;
      edgeRgbError +=
        (Math.abs(input.reference[offset] - input.candidate[offset]) +
          Math.abs(input.reference[offset + 1] - input.candidate[offset + 1]) +
          Math.abs(input.reference[offset + 2] - input.candidate[offset + 2])) /
        (255 * 3);
    }
  }

  return {
    alphaMae: round(alphaError / Math.max(1, pixels)),
    edgeAlphaMae: round(edgeAlphaError / Math.max(1, edgePixelCount)),
    edgeRgbMae: round(edgeRgbError / Math.max(1, edgePixelCount)),
    outsideLeakRatio: round(outsideLeakPixels / Math.max(1, transparentReference)),
    lostOpaqueRatio: round(lostOpaquePixels / Math.max(1, opaqueReference)),
    edgePixelCount,
  };
}

export async function compareImageCandidate(
  sourcePath: string,
  candidatePath: string,
): Promise<RgbaCandidateDiff> {
  const candidateMeta = await sharp(candidatePath).metadata();
  const width = candidateMeta.width ?? 0;
  const height = candidateMeta.height ?? 0;
  if (width <= 0 || height <= 0) throw new Error("Candidate dimensions are unavailable.");

  const reference = await sharp(sourcePath, { failOn: "warning" })
    .autoOrient()
    .ensureAlpha()
    .resize({ width, height, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .toColourspace("srgb")
    .raw({ depth: "uchar" })
    .toBuffer();

  const candidate = await sharp(candidatePath, { failOn: "warning" })
    .autoOrient()
    .ensureAlpha()
    .toColourspace("srgb")
    .raw({ depth: "uchar" })
    .toBuffer();

  return compareRgbaBuffers({
    reference,
    candidate,
    width,
    height,
    channels: 4,
  });
}
