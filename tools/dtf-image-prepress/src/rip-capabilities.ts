export interface RipCapabilityProfile {
  id: string;
  label: string;
  underbaseFromAlpha: boolean;
  adaptiveWhiteFromOpacity: boolean;
  smartChoke: boolean;
  protectWhiteOnlyContent: boolean;
  lowAlphaToleranceControl: boolean;
  chokeUnits: Array<"px" | "mm">;
  sourceIds: string[];
  note: string;
}

export const RIP_CAPABILITY_PROFILES: Record<string, RipCapabilityProfile> = {
  "generic-unknown": {
    id: "generic-unknown",
    label: "Generic / unknown DTF RIP",
    underbaseFromAlpha: true,
    adaptiveWhiteFromOpacity: false,
    smartChoke: false,
    protectWhiteOnlyContent: false,
    lowAlphaToleranceControl: false,
    chokeUnits: [],
    sourceIds: [],
    note:
      "Conservative fallback. Do not assume vendor-specific white/choke behavior; inspect the target RIP preview and local printer calibration.",
  },
  "cadlink-digital-factory": {
    id: "cadlink-digital-factory",
    label: "CADlink / Fiery Digital Factory",
    underbaseFromAlpha: true,
    adaptiveWhiteFromOpacity: true,
    smartChoke: false,
    protectWhiteOnlyContent: false,
    lowAlphaToleranceControl: true,
    chokeUnits: ["px"],
    sourceIds: [
      "cadlink-layer-tab",
      "cadlink-queue-white-choke",
    ],
    note:
      "Supports adaptive white density, valid-pixel tolerance and queue/print-mode choke calibration.",
  },
  "caldera-direct-to-film": {
    id: "caldera-direct-to-film",
    label: "Caldera Direct-to-Film / PrimeCenter",
    underbaseFromAlpha: true,
    adaptiveWhiteFromOpacity: true,
    smartChoke: true,
    protectWhiteOnlyContent: true,
    lowAlphaToleranceControl: true,
    chokeUnits: ["mm"],
    sourceIds: [
      "caldera-white-underlay",
      "caldera-dtf-underbase",
      "caldera-dtf-color-best-practices",
    ],
    note:
      "Supports transparency-aware white, Smart Choke and controls intended to reduce white halos from weak opacity.",
  },
  "flexi-complete-2026": {
    id: "flexi-complete-2026",
    label: "SAi Flexi Complete 2026",
    underbaseFromAlpha: true,
    adaptiveWhiteFromOpacity: false,
    smartChoke: true,
    protectWhiteOnlyContent: true,
    lowAlphaToleranceControl: false,
    chokeUnits: ["px"],
    sourceIds: ["flexi-dtf-choke-2026"],
    note:
      "2026 release notes document choking white only under color while leaving white-only artwork unchanged.",
  },
};

export function getRipCapabilityProfile(id: string): RipCapabilityProfile {
  return RIP_CAPABILITY_PROFILES[id] ?? RIP_CAPABILITY_PROFILES["generic-unknown"];
}
