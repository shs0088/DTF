export interface LocalAdapterPolicy {
  providerId: string;
  requireExplicitLocalModelPath: true;
  allowAutomaticModelDownload: false;
  allowRemoteModelUrl: false;
  requireVerifiedModelSha256: true;
}

export const LOCAL_MODEL_ADAPTER_POLICY: LocalAdapterPolicy = {
  providerId: "*",
  requireExplicitLocalModelPath: true,
  allowAutomaticModelDownload: false,
  allowRemoteModelUrl: false,
  requireVerifiedModelSha256: true,
};

export function assertLocalModelPath(modelPath: string): string {
  if (/^https?:\/\//i.test(modelPath)) {
    throw new Error("Remote model URLs are forbidden by the local-only runtime policy.");
  }
  if (!modelPath.trim()) {
    throw new Error("An explicit preinstalled local model path is required.");
  }
  return modelPath;
}
