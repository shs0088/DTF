import { describe, expect, test } from "bun:test";
import {
  getRipCapabilityProfile,
  RIP_CAPABILITY_PROFILES,
} from "../src/rip-capabilities";
import ledger from "../research/sources.json";

describe("local RIP capability profiles", () => {
  test("unknown RIP always falls back to conservative generic behavior", () => {
    const profile = getRipCapabilityProfile("not-installed");
    expect(profile.id).toBe("generic-unknown");
    expect(profile.smartChoke).toBe(false);
  });

  test("Caldera profile records smart choke and opacity-aware capabilities", () => {
    const profile = getRipCapabilityProfile("caldera-direct-to-film");
    expect(profile.smartChoke).toBe(true);
    expect(profile.adaptiveWhiteFromOpacity).toBe(true);
    expect(profile.protectWhiteOnlyContent).toBe(true);
    expect(profile.sourceIds.length).toBeGreaterThan(0);
  });

  test("all non-generic profiles carry valid research-ledger provenance ids", () => {
    const sourceIds = new Set(ledger.sources.map((source) => source.id));
    for (const profile of Object.values(RIP_CAPABILITY_PROFILES)) {
      if (profile.id === "generic-unknown") continue;
      expect(profile.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of profile.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });
});
