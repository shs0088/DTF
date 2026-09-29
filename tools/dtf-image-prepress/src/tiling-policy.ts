export interface TilingConfiguration {
  tileSize: number | null;
  overlapPx: number;
  paddingPx: number;
  blending: "weighted-overlap" | "crop-pad";
}

export interface TilingPolicy {
  preferWholeImage: true;
  requireOverlapWhenTiled: true;
  requireSeamQa: true;
  minimumOverlapPx: number;
  minimumPaddingPx: number;
}

export const DEFAULT_TILING_POLICY: TilingPolicy = {
  preferWholeImage: true,
  requireOverlapWhenTiled: true,
  requireSeamQa: true,
  minimumOverlapPx: 16,
  minimumPaddingPx: 8,
};

export function validateTilingConfiguration(
  config: TilingConfiguration,
  policy: TilingPolicy = DEFAULT_TILING_POLICY,
): string[] {
  const failures: string[] = [];
  if (config.tileSize == null) return failures;
  if (config.tileSize <= 0) failures.push("tile size must be positive");
  if (config.overlapPx < policy.minimumOverlapPx) {
    failures.push(
      `tile overlap ${config.overlapPx}px is below local benchmark minimum ${policy.minimumOverlapPx}px`,
    );
  }
  if (config.paddingPx < policy.minimumPaddingPx) {
    failures.push(
      `tile padding ${config.paddingPx}px is below local benchmark minimum ${policy.minimumPaddingPx}px`,
    );
  }
  if (config.tileSize != null && config.overlapPx >= config.tileSize) {
    failures.push("tile overlap must be smaller than tile size");
  }
  return failures;
}
