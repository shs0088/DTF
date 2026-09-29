import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "bun:test";
import { assessTileSeams, measureTileSeams } from "../src/tile-seam-qa";

const calibration = {
  id: "tile-seam-local-v1",
  sourceCorpusSha256: "c".repeat(64),
  maximumNormalizedExcess: 0.05,
  maximumRatio: 2,
};

describe("tile seam QA", () => {
  test("requires calibration before automatic seam pass", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-seam-"));
    try {
      const path = join(root, "flat.png");
      await sharp(Buffer.alloc(16 * 4, 120), {
        raw: { width: 16, height: 4, channels: 1 },
      }).png().toFile(path);
      const features = await measureTileSeams({
        imagePath: path,
        tileSizeInputPx: 4,
        scale: 1,
      });
      expect(assessTileSeams(features).status).toBe("review");
      expect(assessTileSeams(features, calibration).status).toBe("pass");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("detects an artificial tile boundary jump", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-seam-"));
    try {
      const path = join(root, "seam.png");
      const values = [];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 16; x++) {
          values.push(x < 8 ? 80 : 200);
        }
      }
      await sharp(Buffer.from(values), {
        raw: { width: 16, height: 4, channels: 1 },
      }).png().toFile(path);
      const features = await measureTileSeams({
        imagePath: path,
        tileSizeInputPx: 8,
        scale: 1,
      });
      const result = assessTileSeams(features, calibration);
      expect(result.status).toBe("review");
      expect(features.normalizedExcess).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
