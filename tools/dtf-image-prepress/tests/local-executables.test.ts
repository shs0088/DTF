import { createHash } from "node:crypto";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { verifyLocalExecutableAsset } from "../src/local-executables";

describe("local executable verification", () => {
  test("accepts a preinstalled executable only when SHA-256 and provenance match", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-bin-"));
    try {
      const path = join(root, "tool");
      const bytes = Buffer.from("#!/bin/sh\nexit 0\n");
      await Bun.write(path, bytes);
      if (process.platform !== "win32") await chmod(path, 0o755);
      const sha = createHash("sha256").update(bytes).digest("hex");

      const result = await verifyLocalExecutableAsset({
        id: "local-test-tool",
        filePath: path,
        expectedSha256: sha,
        licenseId: "test-license",
        provenance: "test-fixture",
        acquisition: "preinstalled-local-only",
      });
      expect(result.verified).toBe(true);
      expect(result.actualSha256).toBe(sha);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects modified executable bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-bin-"));
    try {
      const path = join(root, "tool");
      await Bun.write(path, "changed");
      if (process.platform !== "win32") await chmod(path, 0o755);
      await expect(
        verifyLocalExecutableAsset({
          id: "bad",
          filePath: path,
          expectedSha256: "0".repeat(64),
          licenseId: "test",
          provenance: "test",
          acquisition: "preinstalled-local-only",
        }),
      ).rejects.toThrow("SHA-256 mismatch");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
