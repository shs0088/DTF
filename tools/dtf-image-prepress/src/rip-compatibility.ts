import type { ImageFacts, RipProfile, RoutingSignals } from "./contracts";

export interface RipCompatibilityAdvice {
  masterAction: "preserve-rgba";
  whiteUnderbaseAction: "defer-to-rip";
  chokeAction: "calibrate-in-rip";
  chokeDefaultApplied: false;
  protectWhiteOnlyThinContent: true;
  alphaMode: RipProfile["alphaHandlingMode"];
  warnings: string[];
  notes: string[];
}

export function buildRipCompatibilityAdvice(input: {
  facts: ImageFacts;
  profile: RipProfile;
  routing: RoutingSignals;
}): RipCompatibilityAdvice {
  const warnings: string[] = [];
  const notes: string[] = [
    "Do not bake white underbase into the artwork master.",
    "Do not apply a universal choke value in image prepress; calibrate choke in the target RIP/printer/media profile.",
    "Protect thin white-only text/lines from blanket choke because they can disappear or lose clarity.",
  ];

  const nearTransparentRatio = input.facts.alpha.nearTransparentRatio ?? 0;
  if (nearTransparentRatio > 0) {
    warnings.push(
      `Artwork contains ${Math.round(nearTransparentRatio * 10000) / 100}% very-low-opacity pixels (alpha 1-31/255). Inspect the target RIP white-channel preview for specks/halo; do not delete these pixels automatically because they may be intentional soft artwork.`,
    );
  }

  if (input.facts.alpha.semiTransparentRatio > 0) {
    if (input.profile.alphaHandlingMode === "binary-edge") {
      warnings.push(
        "The target RIP profile expects hard print edges; create a reviewed derived edge candidate only if required, while preserving the original RGBA master.",
      );
    } else if (input.profile.alphaHandlingMode === "rip-adaptive") {
      notes.push(
        "Retain source opacity so an adaptive RIP can derive white density from alpha where supported.",
      );
    } else {
      notes.push("Retain continuous alpha and validate the print on the target RIP/media profile.");
    }
  }

  if (input.routing.intentionalGlowOrShadow) {
    warnings.push(
      "Intentional glow/shadow contains soft opacity and must not be silently converted to opaque pixels or removed as background.",
    );
  }

  if (input.routing.kind === "text-heavy" || input.routing.kind === "logo-line-art") {
    notes.push("Use content-aware RIP choke behavior where available; avoid blanket erosion of thin glyphs/lines.");
  }

  return {
    masterAction: "preserve-rgba",
    whiteUnderbaseAction: "defer-to-rip",
    chokeAction: "calibrate-in-rip",
    chokeDefaultApplied: false,
    protectWhiteOnlyThinContent: true,
    alphaMode: input.profile.alphaHandlingMode,
    warnings,
    notes,
  };
}
