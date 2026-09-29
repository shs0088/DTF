export type ArtworkKind =
  | "photo"
  | "text-heavy"
  | "logo-line-art"
  | "mixed"
  | "already-print-ready";

export type Decision = "accepted" | "review" | "rejected";

export type AlphaHandlingMode =
  | "preserve-continuous"
  | "rip-adaptive"
  | "binary-edge";

export type UnderbaseStrategy =
  | "rip-generated"
  | "external-prepress";

export interface OcrSnapshot {
  text: string;
  confidence?: number;
}

export interface TopologySnapshot {
  connectedComponents?: number;
  holes?: number;
}

export interface AlphaMetrics {
  hasAlpha: boolean;
  transparentRatio: number;
  semiTransparentRatio: number;
  opaqueRatio: number;
  nearTransparentRatio?: number;
  histogram16?: number[];
}

export interface ImageFacts {
  format: string;
  mime?: string;
  byteSize: number;
  pixelWidth: number;
  pixelHeight: number;
  embeddedDpi?: number | null;
  colorSpace?: string | null;
  hasIccProfile?: boolean;
  iccSha256?: string | null;
  pixelDepth?: string | null;
  bitsPerSample?: number | null;
  orientation?: number | null;
  pages?: number;
  pageHeight?: number | null;
  alpha: AlphaMetrics;
}

export interface PrintIntent {
  widthIn: number;
  heightIn: number;
  targetDpi?: number;
}

export interface RipProfile {
  id: string;
  targetDpi: number;
  criticalDpi: number;
  maxUpscaleFactor: number;
  allowSemiTransparency: boolean;
  semiTransparencyReviewThreshold: number;
  alphaHandlingMode: AlphaHandlingMode;
  preserveIntentionalSoftEffects: boolean;
  preferredColorSpace: "srgb";
  bakeWhiteUnderbase: false;
  underbaseStrategy: UnderbaseStrategy;
}

export interface QualityEvidence {
  ocrBefore?: OcrSnapshot;
  ocrAfter?: OcrSnapshot;
  topologyBefore?: TopologySnapshot;
  topologyAfter?: TopologySnapshot;
  colorDeltaE00?: number;
  edgeDisplacementPx?: number;
  alphaFringeScore?: number;
}

export interface PreflightInput {
  facts: ImageFacts;
  intent: PrintIntent;
  profile: RipProfile;
  evidence?: QualityEvidence;
}

export interface PreflightCheck {
  code: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface PreflightResult {
  ruleVersion: "dtf-image-prepress-v1.0";
  effectiveDpi: { x: number; y: number; minimum: number } | null;
  scaleFactorRequired: number | null;
  decision: Decision;
  checks: PreflightCheck[];
}

export interface RoutingSignals {
  kind: ArtworkKind;
  backgroundPresent: boolean;
  vectorLikelihood?: number;
  textDetected?: boolean;
  facesDetected?: boolean;
  blurScore?: number;
  jpegArtifactScore?: number;
  requiresDeblurCandidate?: boolean;
  requiresArtifactReductionCandidate?: boolean;
  foregroundSharesBackgroundColor?: boolean;
  lowContrastBoundary?: boolean;
  intentionalGlowOrShadow?: boolean;
}

export interface ProcessingPlan {
  kind: ArtworkKind;
  stages: string[];
  forbiddenStages: string[];
  requiresHumanReview: boolean;
  reasons: string[];
}

export interface CandidateProvenance {
  sourceSha256: string;
  sourceFacts: ImageFacts;
  candidateSha256: string;
  candidateFacts: ImageFacts;
  createdAt: string;
  operations: Array<{ name: string; version?: string; parameters?: Record<string, unknown> }>;
  preflight: PreflightResult;
  profileId: string;
}
