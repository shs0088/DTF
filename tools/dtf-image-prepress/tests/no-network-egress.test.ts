import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const runtimeRoot = join(import.meta.dir, "..", "src");

const prohibited: Array<[string, RegExp]> = [
  ["fetch()", /\bfetch\s*\(/],
  ["axios", /\baxios\b/],
  ["http.request", /\bhttp\s*\.\s*request\s*\(/],
  ["https.request", /\bhttps\s*\.\s*request\s*\(/],
  ["WebSocket", /\bnew\s+WebSocket\s*\(/],
  ["net.connect", /\bnet\s*\.\s*connect\s*\(/],
  ["tls.connect", /\btls\s*\.\s*connect\s*\(/],
  ["Bun.connect", /\bBun\s*\.\s*connect\s*\(/],
  ["Bun.udpSocket", /\bBun\s*\.\s*udpSocket\s*\(/],
];

async function listTsFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listTsFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

describe("runtime network egress guard", () => {
  test("runtime TypeScript contains no outbound network primitive", async () => {
    const violations: string[] = [];
    for (const file of await listTsFiles(runtimeRoot)) {
      const source = await readFile(file, "utf8");
      for (const [name, pattern] of prohibited) {
        if (pattern.test(source)) violations.push(`${file}: ${name}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
