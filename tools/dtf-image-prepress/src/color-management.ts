import { isAbsolute } from "node:path";

export type RenderingIntent =
  | "perceptual"
  | "relative-colorimetric"
  | "saturation"
  | "absolute-colorimetric";

export interface MasterColorPolicy {
  masterColorSpace: "srgb";
  masterAlpha: "unassociated-linear";
  allowCmykMaster: false;
  alphaParticipatesInIccTransform: false;
  preservePrivateMetadata: false;
  preserveIccProfile: true;
  preserveDensity: true;
}

export const MASTER_COLOR_POLICY: MasterColorPolicy = {
  masterColorSpace: "srgb",
  masterAlpha: "unassociated-linear",
  allowCmykMaster: false,
  alphaParticipatesInIccTransform: false,
  preservePrivateMetadata: false,
  preserveIccProfile: true,
  preserveDensity: true,
};

export interface LocalSoftProofRequest {
  targetIccPath: string;
  renderingIntent: RenderingIntent;
  blackPointCompensation: boolean;
}

export interface LocalSoftProofValidation {
  allowed: boolean;
  failures: string[];
  notes: string[];
}

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function validateLocalSoftProofRequest(
  request: LocalSoftProofRequest,
): LocalSoftProofValidation {
  const failures: string[] = [];
  const notes: string[] = [];

  if (!request.targetIccPath.trim()) {
    failures.push("A target ICC profile path is required.");
  } else if (URL_SCHEME.test(request.targetIccPath)) {
    failures.push("Target ICC must be a local filesystem path; URLs are forbidden.");
  } else if (!isAbsolute(request.targetIccPath)) {
    failures.push("Target ICC profile path must be absolute for deterministic local deployment.");
  }

  if (
    request.blackPointCompensation &&
    request.renderingIntent === "relative-colorimetric"
  ) {
    notes.push(
      "Relative colorimetric with black point compensation is a supported local proofing combination; final choice remains profile/printer specific.",
    );
  }

  if (request.renderingIntent === "perceptual") {
    notes.push(
      "Perceptual rendering may perform profile-specific gamut remapping; compare locally against relative colorimetric before approving a print profile.",
    );
  }

  return { allowed: failures.length === 0, failures, notes };
}
