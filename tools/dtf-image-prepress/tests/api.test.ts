import { describe, expect, test } from "bun:test";
import { createApiHandler } from "../src/api";

describe("standalone API boundary", () => {
  test("health endpoint confirms no OpenCart coupling", async () => {
    const response = await createApiHandler(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.service).toBe("dtf-image-prepress");
    expect(body.opencartCoupled).toBe(false);
    expect(body.adminUiIncluded).toBe(false);
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
