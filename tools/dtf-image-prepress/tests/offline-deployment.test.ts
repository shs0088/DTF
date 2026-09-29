import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const root = join(import.meta.dir, "..");

describe("offline deployment", () => {
  test("compose uses internal network and loopback port", async () => {
    const value = await readFile(
      join(root, "deployment", "docker-compose.offline.yml"),
      "utf8",
    );
    expect(value).toContain("internal: true");
    expect(value).toContain("127.0.0.1:8788:8788");
    expect(value).toContain("./models:/opt/dtf/models:ro");
    expect(value).toContain("./profiles:/opt/dtf/profiles:ro");
    expect(value).toContain("read_only: true");
  });

  test("runtime image has no model download commands", async () => {
    const value = await readFile(
      join(root, "deployment", "Dockerfile.runtime"),
      "utf8",
    );
    expect(value).not.toMatch(/curl|wget|https?:\/\//i);
  });
});
