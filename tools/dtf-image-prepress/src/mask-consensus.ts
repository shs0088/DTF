export interface AlphaMaskReading {
  providerId: string;
  alpha: Uint8Array;
  width: number;
  height: number;
}

export interface MaskConsensusPolicy {
  id: string;
  sourceCorpusSha256: string;
  maximumPairwiseAlphaMad: number;
  minimumForegroundIou: number;
}

export interface PairwiseMaskAgreement {
  leftProviderId: string;
  rightProviderId: string;
  alphaMad: number;
  foregroundIou: number;
}

export interface MaskConsensusResult {
  status: "pass" | "review";
  agreements: PairwiseMaskAgreement[];
  reasons: string[];
  calibrationId?: string;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

function validPolicy(policy: MaskConsensusPolicy): boolean {
  return (
    /^[a-f0-9]{64}$/i.test(policy.sourceCorpusSha256) &&
    policy.maximumPairwiseAlphaMad >= 0 &&
    policy.maximumPairwiseAlphaMad <= 1 &&
    policy.minimumForegroundIou >= 0 &&
    policy.minimumForegroundIou <= 1
  );
}

export function compareAlphaMasks(
  left: AlphaMaskReading,
  right: AlphaMaskReading,
): PairwiseMaskAgreement {
  if (
    left.width !== right.width ||
    left.height !== right.height ||
    left.alpha.length !== right.alpha.length
  ) {
    throw new Error("Mask dimensions must match before consensus comparison.");
  }

  let absoluteError = 0;
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < left.alpha.length; i++) {
    const a = left.alpha[i];
    const b = right.alpha[i];
    absoluteError += Math.abs(a - b) / 255;

    const leftFg = a >= 128;
    const rightFg = b >= 128;
    if (leftFg && rightFg) intersection++;
    if (leftFg || rightFg) union++;
  }

  return {
    leftProviderId: left.providerId,
    rightProviderId: right.providerId,
    alphaMad: round(absoluteError / Math.max(1, left.alpha.length)),
    foregroundIou: round(union === 0 ? 1 : intersection / union),
  };
}

export function evaluateMaskConsensus(
  masks: AlphaMaskReading[],
  policy?: MaskConsensusPolicy,
): MaskConsensusResult {
  const reasons: string[] = [];
  const agreements: PairwiseMaskAgreement[] = [];

  if (masks.length < 2) {
    return {
      status: "review",
      agreements,
      reasons: ["Only one local mask proposal is available; cross-model uncertainty cannot be measured."],
      calibrationId: policy?.id,
    };
  }

  for (let i = 0; i < masks.length; i++) {
    for (let j = i + 1; j < masks.length; j++) {
      agreements.push(compareAlphaMasks(masks[i], masks[j]));
    }
  }

  if (!policy) {
    return {
      status: "review",
      agreements,
      reasons: [
        "No fingerprinted local mask-consensus calibration is installed; pairwise metrics are informational only.",
      ],
    };
  }

  if (!validPolicy(policy)) {
    return {
      status: "review",
      agreements,
      reasons: ["Mask-consensus calibration is invalid or lacks a valid corpus SHA-256."],
      calibrationId: policy.id,
    };
  }

  for (const agreement of agreements) {
    if (agreement.alphaMad > policy.maximumPairwiseAlphaMad) {
      reasons.push(
        `${agreement.leftProviderId} vs ${agreement.rightProviderId}: alpha MAD ${agreement.alphaMad} exceeds calibrated ${policy.maximumPairwiseAlphaMad}.`,
      );
    }
    if (agreement.foregroundIou < policy.minimumForegroundIou) {
      reasons.push(
        `${agreement.leftProviderId} vs ${agreement.rightProviderId}: foreground IoU ${agreement.foregroundIou} is below calibrated ${policy.minimumForegroundIou}.`,
      );
    }
  }

  return {
    status: reasons.length === 0 ? "pass" : "review",
    agreements,
    reasons,
    calibrationId: policy.id,
  };
}
