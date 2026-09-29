export interface AlphaMaskReading {
  providerId: string;
  alpha: Uint8Array;
  width: number;
  height: number;
}

export interface MaskConsensusPolicy {
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
}

const round = (value: number) => Math.round(value * 10000) / 10000;

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
  policy: MaskConsensusPolicy = {
    maximumPairwiseAlphaMad: 0.08,
    minimumForegroundIou: 0.9,
  },
): MaskConsensusResult {
  const reasons: string[] = [];
  const agreements: PairwiseMaskAgreement[] = [];

  if (masks.length < 2) {
    return {
      status: "review",
      agreements,
      reasons: ["Only one local mask proposal is available; cross-model uncertainty cannot be measured."],
    };
  }

  for (let i = 0; i < masks.length; i++) {
    for (let j = i + 1; j < masks.length; j++) {
      const agreement = compareAlphaMasks(masks[i], masks[j]);
      agreements.push(agreement);
      if (agreement.alphaMad > policy.maximumPairwiseAlphaMad) {
        reasons.push(
          `${agreement.leftProviderId} vs ${agreement.rightProviderId}: alpha MAD ${agreement.alphaMad} exceeds ${policy.maximumPairwiseAlphaMad}.`,
        );
      }
      if (agreement.foregroundIou < policy.minimumForegroundIou) {
        reasons.push(
          `${agreement.leftProviderId} vs ${agreement.rightProviderId}: foreground IoU ${agreement.foregroundIou} is below ${policy.minimumForegroundIou}.`,
        );
      }
    }
  }

  return {
    status: reasons.length === 0 ? "pass" : "review",
    agreements,
    reasons,
  };
}
