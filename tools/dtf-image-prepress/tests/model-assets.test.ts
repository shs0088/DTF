import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { verifyLocalModelAsset } from "../src/model-assets";

describe("local model asset verification", () => {
  test("accepts only preinstalled model bytes with matching SHA-256", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dtf-model-"));
    try {
      const path = join(dir, "model.bin");
      const bytes = Buffer.from("offline-model-test");
      await Bun.write(path, bytes);
      const digest = createHash("sha256").update(bytes).digest("hex");

      const verified = await verifyLocalModelAsset({
        id: "test-model",
        providerId: "test-provider",
        filePath: path,
        expectedSha256: digest,
        licenseId: "test-license",
        provenance: "local-test-fixture",
        acquisition: "preinstalled-local-only",
      });
      expect(verified.verified).toBe(true);
      expect(verified.actualSha256).toBe(digest);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rejects a changed local model file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dtf-model-"));
    try {
      const path = join(dir, "model.bin");
      await Bun.write(path, "changed-model");
      await expect(
        verifyLocalModelAsset({
          id: "test-model",
          providerId: "test-provider",
          filePath: path,
          expectedSha256: "0".repeat(64),
          licenseId: "test-license",
          provenance: "local-test-fixture",
          acquisition: "preinstalled-local-only",
        }),
      ).rejects.toThrow("SHA-256 mismatch");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
