import { describe, expect, test } from "bun:test";
import {
  LOCAL_ONLY_EXECUTION_POLICY,
  assertRuntimeProviderAllowed,
  getRuntimeProviders,
} from "../src/execution-policy";

describe("local-only execution policy", () => {
  test("never allows runtime network egress", () => {
    expect(LOCAL_ONLY_EXECUTION_POLICY.externalNetworkAllowed).toBe(false);
    expect(LOCAL_ONLY_EXECUTION_POLICY.imageDataMayLeaveSite).toBe(false);
    expect(LOCAL_ONLY_EXECUTION_POLICY.metadataMayLeaveSite).toBe(false);
  });

  test("runtime catalog contains only local providers", () => {
    const providers = getRuntimeProviders();
    expect(providers.length).toBeGreaterThan(0);
    for (const provider of providers) {
      expect(provider.deploymentModes).toContain("local");
      expect(provider.deploymentModes).not.toContain("external-api");
      expect(provider.status).not.toBe("commercial-api");
    }
  });

  test("blocks cloud/reference providers even when present in research catalog", () => {
    expect(() => assertRuntimeProviderAllowed("cloudinary-background-removal")).toThrow(
      "runtime processing is local-only",
    );
    expect(() => assertRuntimeProviderAllowed("adobe-illustrator-image-trace")).toThrow(
      "runtime processing is local-only",
    );
  });

  test("allows approved local core provider", () => {
    expect(assertRuntimeProviderAllowed("sharp").id).toBe("sharp");
  });
});
