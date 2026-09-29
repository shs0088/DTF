import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "bun:test";
import { inspectRaster } from "../src/sharp-io";

describe("alpha histogram inspection", () => {
  test("records transparent near-transparent semi-transparent and opaque pixels", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-alpha-"));
    try {
      const path = join(root, "alpha.png");
      const data = Buffer.from([
        255, 0, 0, 0,
        255, 0, 0, 1,
        255, 0, 0, 128,
        255, 0, 0, 255,
      ]);
      await sharp(data, { raw: { width: 2, height: 2, channels: 4 } })
        .png()
        .toFile(path);

      const facts = await inspectRaster(path);
      expect(facts.alpha.transparentRatio).toBe(0.25);
      expect(facts.alpha.semiTransparentRatio).toBe(0.5);
      expect(facts.alpha.opaqueRatio).toBe(0.25);
      expect(facts.alpha.nearTransparentRatio).toBe(0.25);
      expect(facts.alpha.histogram16?.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
