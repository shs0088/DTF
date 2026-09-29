import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { createDeterministicCandidate } from "../src/engine";

describe("candidate provenance", () => {
  test("records hashes and metadata before and after deterministic export", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dtf-candidate-"));
    try {
      const source = join(dir, "source.png");
      const output = join(dir, "candidate.png");
      await sharp({
        create: {
          width: 600,
          height: 600,
          channels: 4,
          background: { r: 20, g: 40, b: 60, alpha: 1 },
        },
      })
        .png()
        .withMetadata({ density: 72 })
        .toFile(source);

      const result = await createDeterministicCandidate(
        {
          sourcePath: source,
          intent: { widthIn: 2, heightIn: 2 },
          routing: { kind: "already-print-ready", backgroundPresent: false },
        },
        output,
      );

      expect(result.provenance.sourceSha256).toHaveLength(64);
      expect(result.provenance.candidateSha256).toHaveLength(64);
      expect(result.provenance.sourceFacts.pixelWidth).toBe(600);
      expect(result.provenance.candidateFacts.pixelWidth).toBe(600);
      expect(result.provenance.candidateFacts.embeddedDpi).toBe(300);
      expect(result.provenance.candidateFacts.colorSpace).toBe("srgb");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
