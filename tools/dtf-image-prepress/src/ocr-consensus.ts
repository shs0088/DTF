export interface OcrEngineReading {
  engineId: string;
  text: string;
  confidence?: number;
}

export interface OcrConsensusPolicy {
  minimumConfidence: number;
  minimumPairwiseSimilarity: number;
}

export interface OcrConsensusResult {
  status: "pass" | "review";
  reliableReadings: OcrEngineReading[];
  lowConfidenceEngines: string[];
  minimumObservedSimilarity: number | null;
  representativeText: string | null;
  reasons: string[];
}

export const DEFAULT_OCR_CONSENSUS_POLICY: OcrConsensusPolicy = {
  minimumConfidence: 0.8,
  minimumPairwiseSimilarity: 0.98,
};

function chars(value: string) {
  return [...value.normalize("NFKC")];
}

function levenshtein(a: string, b: string): number {
  const x = chars(a);
  const y = chars(b);
  const row = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const saved = row[j];
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = saved;
    }
  }
  return row[y.length];
}

export function ocrTextSimilarity(a: string, b: string): number {
  const left = a.trim();
  const right = b.trim();
  const denominator = Math.max(chars(left).length, chars(right).length, 1);
  return Math.max(0, 1 - levenshtein(left, right) / denominator);
}

export function evaluateOcrConsensus(
  readings: OcrEngineReading[],
  policy: OcrConsensusPolicy = DEFAULT_OCR_CONSENSUS_POLICY,
): OcrConsensusResult {
  const reasons: string[] = [];
  const lowConfidenceEngines = readings
    .filter((reading) => (reading.confidence ?? 0) < policy.minimumConfidence)
    .map((reading) => reading.engineId);

  const reliableReadings = readings.filter(
    (reading) => (reading.confidence ?? 0) >= policy.minimumConfidence,
  );

  if (readings.length < 2) {
    reasons.push("Only one OCR engine reading is available; cross-engine verification is unavailable.");
  }
  if (lowConfidenceEngines.length > 0) {
    reasons.push(`Low OCR confidence from: ${lowConfidenceEngines.join(", ")}.`);
  }
  if (reliableReadings.length < 2) {
    reasons.push("Fewer than two reliable OCR readings are available.");
  }

  let minimumObservedSimilarity: number | null = null;
  for (let i = 0; i < reliableReadings.length; i++) {
    for (let j = i + 1; j < reliableReadings.length; j++) {
      const similarity = ocrTextSimilarity(
        reliableReadings[i].text,
        reliableReadings[j].text,
      );
      minimumObservedSimilarity =
        minimumObservedSimilarity == null
          ? similarity
          : Math.min(minimumObservedSimilarity, similarity);
    }
  }

  if (
    minimumObservedSimilarity != null &&
    minimumObservedSimilarity < policy.minimumPairwiseSimilarity
  ) {
    reasons.push(
      `OCR engines disagree: minimum pairwise similarity ${Math.round(minimumObservedSimilarity * 10000) / 100}%.`,
    );
  }

  const representativeText =
    reliableReadings.length === 0
      ? null
      : [...reliableReadings].sort(
          (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
        )[0].text;

  const status =
    readings.length >= 2 &&
    reliableReadings.length >= 2 &&
    lowConfidenceEngines.length === 0 &&
    (minimumObservedSimilarity ?? 0) >= policy.minimumPairwiseSimilarity
      ? "pass"
      : "review";

  return {
    status,
    reliableReadings,
    lowConfidenceEngines,
    minimumObservedSimilarity,
    representativeText,
    reasons,
  };
}
