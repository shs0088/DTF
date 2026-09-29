import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ModelArtifactFormat } from "./model-format-policy";
import { assertRuntimeModelFormat } from "./model-format-policy";

export interface ModelBundleEntry {
  relativePath: string;
  sha256: string;
}

export interface LocalModelBundle {
  id: string;
  providerId: string;
  rootPath: string;
  format: ModelArtifactFormat;
  licenseId: string;
  provenance: string;
  entries: ModelBundleEntry[];
  acquisition: "preinstalled-local-only";
}

export interface VerifiedModelBundleEntry extends ModelBundleEntry {
  absolutePath: string;
  byteSize: number;
}

export interface VerifiedLocalModelBundle extends LocalModelBundle {
  entries: VerifiedModelBundleEntry[];
  verified: true;
}

function validateRelativeEntryPath(value: string): void {
  if (!value.trim()) throw new Error("Model bundle entry path cannot be empty.");
  if (isAbsolute(value)) throw new Error("Model bundle entry path must be relative.");
  const normalized = value.replace(/\\/g, "/");
  if (normalized.split("/").some((part) => part === "..")) {
    throw new Error("Model bundle entry path traversal is forbidden.");
  }
}

function isContained(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel));
}

async function sha256Streaming(path: string): Promise<string> {
  return await new Promise<string>((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

export async function verifyLocalModelBundle(
  bundle: LocalModelBundle,
): Promise<VerifiedLocalModelBundle> {
  if (bundle.acquisition !== "preinstalled-local-only") {
    throw new Error("Model bundle acquisition must be preinstalled-local-only.");
  }
  assertRuntimeModelFormat(bundle.format);

  if (!isAbsolute(bundle.rootPath)) {
    throw new Error("Model bundle root must be an absolute local path.");
  }
  if (!bundle.id.trim() || !bundle.providerId.trim()) {
    throw new Error("Model bundle id and provider id are required.");
  }
  if (!bundle.licenseId.trim() || !bundle.provenance.trim()) {
    throw new Error("Model bundle license and provenance are required.");
  }
  if (bundle.entries.length === 0) {
    throw new Error("Model bundle must declare at least one file.");
  }

  const rootReal = await realpath(bundle.rootPath);
  const rootInfo = await stat(rootReal);
  if (!rootInfo.isDirectory()) throw new Error("Model bundle root must be a directory.");

  const seen = new Set<string>();
  const verifiedEntries: VerifiedModelBundleEntry[] = [];

  for (const entry of bundle.entries) {
    validateRelativeEntryPath(entry.relativePath);
    if (!/^[a-f0-9]{64}$/i.test(entry.sha256)) {
      throw new Error("Invalid SHA-256 for bundle entry " + entry.relativePath + ".");
    }
    if (seen.has(entry.relativePath)) {
      throw new Error("Duplicate model bundle entry: " + entry.relativePath + ".");
    }
    seen.add(entry.relativePath);

    const candidate = resolve(rootReal, entry.relativePath);
    if (!isContained(rootReal, candidate)) {
      throw new Error("Model bundle entry escapes root: " + entry.relativePath + ".");
    }

    const linkInfo = await lstat(candidate);
    if (linkInfo.isSymbolicLink()) {
      throw new Error("Symbolic links are forbidden in model bundles: " + entry.relativePath + ".");
    }
    if (!linkInfo.isFile()) {
      throw new Error("Model bundle entry is not a regular file: " + entry.relativePath + ".");
    }
    if (linkInfo.nlink > 1) {
      throw new Error("Hard-linked model bundle files are forbidden: " + entry.relativePath + ".");
    }

    const candidateReal = await realpath(candidate);
    if (!isContained(rootReal, candidateReal)) {
      throw new Error("Resolved model bundle entry escapes root: " + entry.relativePath + ".");
    }

    const actualSha256 = await sha256Streaming(candidateReal);
    if (actualSha256.toLowerCase() !== entry.sha256.toLowerCase()) {
      throw new Error(
        "Model bundle SHA-256 mismatch for " + entry.relativePath +
        ": expected " + entry.sha256 + ", got " + actualSha256,
      );
    }

    verifiedEntries.push({
      ...entry,
      absolutePath: candidateReal,
      byteSize: linkInfo.size,
    });
  }

  return {
    ...bundle,
    rootPath: rootReal,
    entries: verifiedEntries,
    verified: true,
  };
}
