import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { verifyLocalModelBundle } from "../src/model-bundle";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

describe("local model bundle verification", () => {
  test("verifies a multi-file local NCNN bundle", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-bundle-"));
    try {
      await Bun.write(join(root, "model.param"), "param-bytes");
      await Bun.write(join(root, "model.bin"), "weight-bytes");

      const result = await verifyLocalModelBundle({
        id: "realesrgan-local",
        providerId: "real-esrgan",
        rootPath: root,
        format: "ncnn",
        licenseId: "BSD-3-Clause",
        provenance: "pinned-local-test",
        acquisition: "preinstalled-local-only",
        entries: [
          { relativePath: "model.param", sha256: digest("param-bytes") },
          { relativePath: "model.bin", sha256: digest("weight-bytes") },
        ],
      });

      expect(result.verified).toBe(true);
      expect(result.entries).toHaveLength(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects path traversal before model execution", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-bundle-"));
    try {
      await expect(
        verifyLocalModelBundle({
          id: "bad",
          providerId: "bad",
          rootPath: root,
          format: "onnx-external-data",
          licenseId: "test",
          provenance: "test",
          acquisition: "preinstalled-local-only",
          entries: [{ relativePath: "../outside.bin", sha256: "0".repeat(64) }],
        }),
      ).rejects.toThrow("path traversal");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("does not permit blocked PyTorch runtime formats", async () => {
    const root = await mkdtemp(join(tmpdir(), "dtf-bundle-"));
    try {
      await Bun.write(join(root, "model.pth"), "pickle-like");
      await expect(
        verifyLocalModelBundle({
          id: "blocked",
          providerId: "research-only",
          rootPath: root,
          format: "pytorch-pickle",
          licenseId: "test",
          provenance: "test",
          acquisition: "preinstalled-local-only",
          entries: [{ relativePath: "model.pth", sha256: digest("pickle-like") }],
        }),
      ).rejects.toThrow("not allowed in production runtime");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
