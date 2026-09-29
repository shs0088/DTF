import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { assertLocalModelPath } from "./local-adapter-policy";

export interface LocalModelAsset {
  id: string;
  providerId: string;
  filePath: string;
  expectedSha256: string;
  licenseId: string;
  provenance: string;
  acquisition: "preinstalled-local-only";
}

export interface VerifiedLocalModelAsset extends LocalModelAsset {
  actualSha256: string;
  byteSize: number;
  verified: true;
}

async function sha256FileStreaming(path: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function verifyLocalModelAsset(
  asset: LocalModelAsset,
): Promise<VerifiedLocalModelAsset> {
  if (asset.acquisition !== "preinstalled-local-only") {
    throw new Error("Runtime model acquisition must be preinstalled-local-only.");
  }
  if (!asset.id.trim() || !asset.providerId.trim()) {
    throw new Error("Model id and provider id are required.");
  }
  if (!asset.licenseId.trim() || !asset.provenance.trim()) {
    throw new Error("Model license and provenance are required before runtime use.");
  }
  if (!/^[a-f0-9]{64}$/i.test(asset.expectedSha256)) {
    throw new Error("Expected model SHA-256 must be a 64-character hexadecimal digest.");
  }

  const filePath = assertLocalModelPath(asset.filePath);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Local model asset is missing: ${filePath}`);
  }

  const actualSha256 = await sha256FileStreaming(filePath);
  if (actualSha256.toLowerCase() !== asset.expectedSha256.toLowerCase()) {
    throw new Error(
      `Local model SHA-256 mismatch for ${asset.id}: expected ${asset.expectedSha256}, got ${actualSha256}`,
    );
  }

  const fileStat = await stat(filePath);
  return {
    ...asset,
    filePath,
    actualSha256,
    byteSize: fileStat.size,
    verified: true,
  };
}
