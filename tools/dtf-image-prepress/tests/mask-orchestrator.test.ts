import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "bun:test";
import { compareLocalMaskCandidates } from "../src/mask-orchestrator";

const policy = {
  id: "local-mask-cal-v1",
  sourceCorpusSha256: "b".repeat(64),
  maximumPairwiseAlphaMad: 0.08,
  minimumForegroundIou: 0.9,
};

async function writeMask(path: string, values: number[]) {
  await sharp(Buffer.from(values), {
    raw: { width: 2, height: 2, channels: 1 },
  }).png().toFile(path);
}

describe("local mask candidate orchestrator", () => {
  test("passes agreeing local source-space masks only with calibration", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-masks-"));
    try {
      const a = join(root, "a.png");
      const b = join(root, "b.png");
      await writeMask(a, [0, 0, 255, 255]);
      await writeMask(b, [0, 4, 252, 255]);
      const report = await compareLocalMaskCandidates({
        candidates: [
          { providerId: "birefnet", maskPath: a },
          { providerId: "ben2-onnx", maskPath: b },
        ],
        policy,
        analysisMaxDimension: 64,
      });
      expect(report.consensus.status).toBe("pass");
      expect(report.candidates).toHaveLength(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("without calibration even identical masks remain review-only", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-masks-"));
    try {
      const a = join(root, "a.png");
      const b = join(root, "b.png");
      await writeMask(a, [0, 0, 255, 255]);
      await writeMask(b, [0, 0, 255, 255]);
      const report = await compareLocalMaskCandidates({
        candidates: [
          { providerId: "birefnet", maskPath: a },
          { providerId: "ben2-onnx", maskPath: b },
        ],
        analysisMaxDimension: 64,
      });
      expect(report.consensus.status).toBe("review");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
