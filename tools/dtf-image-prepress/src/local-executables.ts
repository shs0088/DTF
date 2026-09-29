import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { LocalProcessResult, LocalProcessSpec } from "./local-process-runner";
import { runLocalProcess } from "./local-process-runner";

export interface LocalExecutableAsset {
  id: string;
  filePath: string;
  expectedSha256: string;
  licenseId: string;
  provenance: string;
  acquisition: "preinstalled-local-only";
}

export interface VerifiedLocalExecutableAsset extends LocalExecutableAsset {
  filePath: string;
  actualSha256: string;
  byteSize: number;
  verified: true;
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

export async function verifyLocalExecutableAsset(
  asset: LocalExecutableAsset,
): Promise<VerifiedLocalExecutableAsset> {
  if (asset.acquisition !== "preinstalled-local-only") {
    throw new Error("Executable acquisition must be preinstalled-local-only.");
  }
  if (!isAbsolute(asset.filePath)) {
    throw new Error("Executable path must be an absolute local path.");
  }
  if (!asset.id.trim() || !asset.licenseId.trim() || !asset.provenance.trim()) {
    throw new Error("Executable id, license and provenance are required.");
  }
  if (!/^[a-f0-9]{64}$/i.test(asset.expectedSha256)) {
    throw new Error("Executable SHA-256 must be a 64-character hexadecimal digest.");
  }

  const info = await lstat(asset.filePath);
  if (info.isSymbolicLink()) {
    throw new Error("Symbolic-link executables are forbidden.");
  }
  if (!info.isFile()) {
    throw new Error("Executable asset must be a regular file.");
  }
  if (info.nlink > 1) {
    throw new Error("Hard-linked executable assets are forbidden.");
  }
  if (process.platform !== "win32" && (info.mode & 0o111) === 0) {
    throw new Error("Executable asset does not have an executable permission bit.");
  }

  const canonicalPath = await realpath(asset.filePath);
  const actualSha256 = await sha256Streaming(canonicalPath);
  if (actualSha256.toLowerCase() !== asset.expectedSha256.toLowerCase()) {
    throw new Error(
      "Executable SHA-256 mismatch for " + asset.id +
      ": expected " + asset.expectedSha256 + ", got " + actualSha256,
    );
  }

  return {
    ...asset,
    filePath: canonicalPath,
    actualSha256,
    byteSize: info.size,
    verified: true,
  };
}

export async function runVerifiedLocalProcess(
  spec: LocalProcessSpec,
  executable: VerifiedLocalExecutableAsset,
): Promise<LocalProcessResult> {
  const specPath = await realpath(spec.executablePath);
  if (specPath !== executable.filePath) {
    throw new Error(
      "Process executable does not match the verified executable asset: " + executable.id,
    );
  }
  if (!executable.verified) {
    throw new Error("Executable asset has not been verified.");
  }
  return await runLocalProcess(spec);
}
