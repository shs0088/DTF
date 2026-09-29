import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const root = join(import.meta.dir, "..", "deployment", "python");

describe("offline Python wheelhouse contract", () => {
  test("installer disables indexes and dependency downloads", async () => {
    const source = await readFile(join(root, "install_offline.py"), "utf8");
    expect(source).toContain('"--no-index"');
    expect(source).toContain('"--no-deps"');
    expect(source).toContain('"PIP_NO_INDEX": "1"');
    expect(source).toContain('"HF_HUB_OFFLINE": "1"');
  });

  test("wheelhouse verifier requires SHA-256 and rejects traversal", async () => {
    const source = await readFile(join(root, "verify_wheelhouse.py"), "utf8");
    expect(source).toContain("sha256_file");
    expect(source).toContain('".." in rel.parts');
    expect(source).toContain("symlink wheel is forbidden");
  });
});
