import { describe, expect, test } from "bun:test";
import ledger from "../research/sources.json";
import { getResearchLedgerStatus } from "../src/research-ledger";

describe("research ledger", () => {
  test("counts only unique verified source URLs", () => {
    const status = getResearchLedgerStatus();
    expect(status.uniqueUrls).toBe(true);
    expect(status.verifiedCount).toBe(ledger.sources.length);
    expect(status.goal).toBe(10_000);
    expect(status.remaining).toBe(10_000 - ledger.sources.length);
  });

  test("every source has an auditable decision and category", () => {
    for (const source of ledger.sources) {
      expect(source.url.startsWith("https://")).toBe(true);
      expect(source.category.length).toBeGreaterThan(2);
      expect(source.decision.length).toBeGreaterThan(10);
      expect(source.verification).toBe("opened-and-reviewed");
    }
  });
});
