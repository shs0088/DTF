import { describe, expect, test } from "bun:test";
import { createApiHandler } from "../src/api";

describe("standalone API boundary", () => {
  test("health endpoint confirms no OpenCart coupling and local-only execution", async () => {
    const response = await createApiHandler(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.service).toBe("dtf-image-prepress");
    expect(body.opencartCoupled).toBe(false);
    expect(body.adminUiIncluded).toBe(false);
    expect(body.executionPolicy.externalNetworkAllowed).toBe(false);
    expect(body.executionPolicy.imageDataMayLeaveSite).toBe(false);
    expect(body.executionPolicy.metadataMayLeaveSite).toBe(false);
  });

  test("providers endpoint exposes only local runtime providers", async () => {
    const response = await createApiHandler(new Request("http://localhost/v1/providers"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionPolicy.externalNetworkAllowed).toBe(false);
    expect(body.providers.length).toBeGreaterThan(0);
    for (const provider of body.providers) {
      expect(provider.deploymentModes).toContain("local");
      expect(provider.deploymentModes).not.toContain("external-api");
      expect(provider.status).not.toBe("commercial-api");
    }
  });

  test("analyze endpoint rejects missing file without touching image engine", async () => {
    const form = new FormData();
    form.set("widthIn", "16");
    form.set("heightIn", "18");
    form.set("kind", "text-heavy");
    const response = await createApiHandler(
      new Request("http://localhost/v1/analyze", { method: "POST", body: form }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid-request");
  });
});
