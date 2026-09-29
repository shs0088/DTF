import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const runtimeRoot = join(import.meta.dir, "..", "src");
const adaptersRoot = join(import.meta.dir, "..", "adapters");

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

async function listFiles(root: string, extension: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path, extension)));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(path);
  }
  return files;
}

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

  test("Python adapters contain no network/download primitive", async () => {
    const prohibitedPython: Array<[string, RegExp]> = [
      ["requests", /\b(?:import|from)\s+requests\b/],
      ["urllib", /\b(?:import|from)\s+urllib\b/],
      ["socket", /\b(?:import|from)\s+socket\b/],
      ["httpx", /\b(?:import|from)\s+httpx\b/],
      ["aiohttp", /\b(?:import|from)\s+aiohttp\b/],
      ["huggingface_hub", /\b(?:import|from)\s+huggingface_hub\b/],
      ["hf_hub_download", /\bhf_hub_download\s*\(/],
      ["snapshot_download", /\bsnapshot_download\s*\(/],
      ["from_pretrained", /\.from_pretrained\s*\(/],
      ["urlopen", /\burlopen\s*\(/],
    ];

    const violations: string[] = [];
    for (const file of await listFiles(adaptersRoot, ".py")) {
      const source = await readFile(file, "utf8");
      for (const [name, pattern] of prohibitedPython) {
        if (pattern.test(source)) violations.push(`${file}: ${name}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
