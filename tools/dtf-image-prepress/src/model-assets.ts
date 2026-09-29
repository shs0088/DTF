import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";

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

export async function verifyLocalModelAsset(
  asset: LocalModelAsset,
): Promise<VerifiedLocalModelAsset> {
  if (asset.acquisition !== "preinstalled-local-only") {
    throw new Error("Runtime model acquisition must be preinstalled-local-only.");
  }
  if (!/^[a-f0-9]{64}$/i.test(asset.expectedSha256)) {
    throw new Error("Expected model SHA-256 must be a 64-character hexadecimal digest.");
  }

  const file = Bun.file(asset.filePath);
  if (!(await file.exists())) {
    throw new Error(`Local model asset is missing: ${asset.filePath}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const actualSha256 = createHash("sha256").update(buffer).digest("hex");
  if (actualSha256.toLowerCase() !== asset.expectedSha256.toLowerCase()) {
    throw new Error(
      `Local model SHA-256 mismatch for ${asset.id}: expected ${asset.expectedSha256}, got ${actualSha256}`,
    );
  }

  const fileStat = await stat(asset.filePath);
  return {
    ...asset,
    actualSha256,
    byteSize: fileStat.size,
    verified: true,
  };
}
