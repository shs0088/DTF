export type BenchmarkDatasetStatus =
  | "allowed-with-agreement"
  | "reference-only"
  | "license-review";

export interface BenchmarkDatasetDescriptor {
  id: string;
  task: "matting" | "super-resolution" | "ocr";
  status: BenchmarkDatasetStatus;
  runtimeUse: false;
  autoDownloadAllowed: false;
  localPreinstallRequired: true;
  licenseNote: string;
  purpose: string;
}

export const BENCHMARK_DATASETS: BenchmarkDatasetDescriptor[] = [
  {
    id: "p3m-10k",
    task: "matting",
    status: "allowed-with-agreement",
    runtimeUse: false,
    autoDownloadAllowed: false,
    localPreinstallRequired: true,
    licenseNote:
      "Official P3M repository publishes a P3M-10k Dataset Release Agreement labeled MIT; retain the accepted agreement with the local benchmark copy.",
    purpose:
      "High-resolution portrait matting benchmark with ground-truth alpha; development/lab only.",
  },
  {
    id: "aim-500",
    task: "matting",
    status: "allowed-with-agreement",
    runtimeUse: false,
    autoDownloadAllowed: false,
    localPreinstallRequired: true,
    licenseNote:
      "Official AIM repository publishes the AIM-500 Dataset Release Agreement labeled MIT; retain the accepted agreement with the local benchmark copy.",
    purpose:
      "Diverse natural-image matting benchmark including transparent/meticulous foregrounds.",
  },
  {
    id: "am-2k",
    task: "matting",
    status: "license-review",
    runtimeUse: false,
    autoDownloadAllowed: false,
    localPreinstallRequired: true,
    licenseNote:
      "Official repository requires a dataset release agreement; legal/use terms must be reviewed before local inclusion.",
    purpose:
      "Animal/hair/fur boundary benchmark useful for difficult edge mattes.",
  },
  {
    id: "div2k",
    task: "super-resolution",
    status: "reference-only",
    runtimeUse: false,
    autoDownloadAllowed: false,
    localPreinstallRequired: true,
    licenseNote:
      "Official DIV2K page states academic research purpose only; do not include in a commercial-product benchmark corpus without separate permission.",
    purpose:
      "Canonical super-resolution research reference only under current policy.",
  },
  {
    id: "realsr",
    task: "super-resolution",
    status: "license-review",
    runtimeUse: false,
    autoDownloadAllowed: false,
    localPreinstallRequired: true,
    licenseNote:
      "Official repository describes the captured benchmark but licensing must be verified before local commercial-development use.",
    purpose:
      "Real camera/lens super-resolution benchmark reference.",
  },
];

export function runtimeDatasets(): BenchmarkDatasetDescriptor[] {
  return BENCHMARK_DATASETS.filter((dataset) => dataset.runtimeUse);
}
