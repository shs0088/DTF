import type {
  CandidateProvenance,
  PrintIntent,
  QualityEvidence,
  RipProfile,
  RoutingSignals,
} from "./contracts";
import { runPreflight } from "./preflight";
import { DEFAULT_RIP_PROFILE } from "./rules";
import { buildProcessingPlan } from "./router";
import { inspectRaster, sha256File, writeSafeRgbaCandidate } from "./sharp-io";
import { inspectInputSecurity } from "./input-security";

export interface AnalyzeRequest {
  sourcePath: string;
  intent: PrintIntent;
  routing: RoutingSignals;
  profile?: RipProfile;
  evidence?: QualityEvidence;
}

export async function analyzeSource(request: AnalyzeRequest) {
  const profile = request.profile ?? DEFAULT_RIP_PROFILE;
  const inputSecurity = await inspectInputSecurity(request.sourcePath);
  if (!inputSecurity.allowed) {
    throw new Error(`Input rejected by local security policy: ${inputSecurity.failures.join(" | ")}`);
  }
  const facts = await inspectRaster(request.sourcePath);
  const preflight = runPreflight({ facts, intent: request.intent, profile, evidence: request.evidence });
  const plan = buildProcessingPlan(request.routing);
  return { facts, preflight, plan, profile, inputSecurity };
}

export async function createDeterministicCandidate(
  request: AnalyzeRequest,
  outputPath: string,
) {
  const analysis = await analyzeSource(request);
  if (analysis.preflight.decision === "rejected") {
    throw new Error("Source is rejected by deterministic preflight; candidate generation is blocked.");
  }

  const needsUpscale = (analysis.preflight.scaleFactorRequired ?? 1) > 1;
  if (needsUpscale) {
    throw new Error(
      "Source requires enlargement. A dedicated validated upscaler candidate must be produced and QA-checked before master export.",
    );
  }

  await writeSafeRgbaCandidate(request.sourcePath, outputPath, {
    widthIn: request.intent.widthIn,
    heightIn: request.intent.heightIn,
    targetDpi: analysis.profile.targetDpi,
    allowUpscale: false,
  });

  const candidateFacts = await inspectRaster(outputPath);
  const provenance: CandidateProvenance = {
    sourceSha256: await sha256File(request.sourcePath),
    sourceFacts: analysis.facts,
    candidateSha256: await sha256File(outputPath),
    candidateFacts,
    createdAt: new Date().toISOString(),
    operations: [
      { name: "preserve-original", version: "v1" },
      { name: "normalize-color-space", version: "sharp", parameters: { target: "sRGB" } },
      { name: "preserve-alpha", version: "sharp" },
      { name: "write-derived-rgba-candidate", version: "v1", parameters: { density: analysis.profile.targetDpi } },
    ],
    preflight: analysis.preflight,
    profileId: analysis.profile.id,
  };

  return { ...analysis, outputPath, provenance };
}
