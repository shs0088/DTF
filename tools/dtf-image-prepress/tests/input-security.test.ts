import { describe, expect, test } from "bun:test";
import { inspectSvgOfflineSafety } from "../src/input-security";

describe("input security", () => {
  test("rejects SVG script and external references", () => {
    const result = inspectSvgOfflineSafety(
      '<svg><script>alert(1)</script><image href="https://example.com/a.png"/></svg>',
    );
    expect(result.allowed).toBe(false);
    expect(result.failures.join(" ")).toContain("scripts");
    expect(result.failures.join(" ")).toContain("external references");
  });

  test("allows static self-contained SVG markup for future dedicated inspector", () => {
    const result = inspectSvgOfflineSafety(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>',
    );
    expect(result.allowed).toBe(true);
  });

  test("rejects XML entity/doctype constructs", () => {
    const result = inspectSvgOfflineSafety(
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>',
    );
    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(2);
  });
});
