import { isAbsolute } from "node:path";

export interface LocalAdapterPolicy {
  providerId: string;
  requireExplicitLocalModelPath: true;
  allowAutomaticModelDownload: false;
  allowRemoteModelUrl: false;
  requireVerifiedModelSha256: true;
  requireAbsoluteModelPath: true;
}

export const LOCAL_MODEL_ADAPTER_POLICY: LocalAdapterPolicy = {
  providerId: "*",
  requireExplicitLocalModelPath: true,
  allowAutomaticModelDownload: false,
  allowRemoteModelUrl: false,
  requireVerifiedModelSha256: true,
  requireAbsoluteModelPath: true,
};

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function assertLocalModelPath(modelPath: string): string {
  const value = modelPath.trim();
  if (!value) {
    throw new Error("An explicit preinstalled local model path is required.");
  }
  if (URL_SCHEME.test(value) || value.startsWith("//")) {
    throw new Error("Remote model URLs are forbidden by the local-only runtime policy.");
  }
  if (!isAbsolute(value)) {
    throw new Error("Model path must be an absolute local filesystem path.");
  }
  return value;
}
