import { describe, expect, test } from "bun:test";
import { BENCHMARK_DATASETS, runtimeDatasets } from "../src/benchmark-datasets";

describe("benchmark dataset policy", () => {
  test("never exposes benchmark datasets to customer runtime", () => {
    expect(runtimeDatasets()).toEqual([]);
    for (const dataset of BENCHMARK_DATASETS) {
      expect(dataset.runtimeUse).toBe(false);
      expect(dataset.autoDownloadAllowed).toBe(false);
      expect(dataset.localPreinstallRequired).toBe(true);
    }
  });

  test("keeps academic-only DIV2K reference-only", () => {
    expect(BENCHMARK_DATASETS.find((x) => x.id === "div2k")?.status).toBe(
      "reference-only",
    );
  });

  test("requires accepted local agreement for P3M/AIM", () => {
    expect(BENCHMARK_DATASETS.find((x) => x.id === "p3m-10k")?.status).toBe(
      "allowed-with-agreement",
    );
    expect(BENCHMARK_DATASETS.find((x) => x.id === "aim-500")?.status).toBe(
      "allowed-with-agreement",
    );
  });
});
