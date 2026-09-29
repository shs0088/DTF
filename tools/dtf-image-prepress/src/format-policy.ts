export interface FormatProcessingPolicy {
  format: string;
  masterOutputAllowed: boolean;
  alphaTransfer: "linear" | "not-applicable";
  colorTransferManaged: boolean;
  supportsMultipleFrames: boolean;
  masterRule: string;
}

export const FORMAT_POLICIES: Record<string, FormatProcessingPolicy> = {
  png: {
    format: "png",
    masterOutputAllowed: true,
    alphaTransfer: "linear",
    colorTransferManaged: true,
    supportsMultipleFrames: true,
    masterRule:
      "PNG alpha is a linear opacity fraction and must never receive gamma/color transfer correction. Animated PNG must resolve to one explicit frame before master approval.",
  },
  jpg: {
    format: "jpg",
    masterOutputAllowed: false,
    alphaTransfer: "not-applicable",
    colorTransferManaged: true,
    supportsMultipleFrames: false,
    masterRule:
      "JPEG may be accepted as a source but final transparent DTF master must be derived to RGBA PNG.",
  },
  jpeg: {
    format: "jpeg",
    masterOutputAllowed: false,
    alphaTransfer: "not-applicable",
    colorTransferManaged: true,
    supportsMultipleFrames: false,
    masterRule:
      "JPEG may be accepted as a source but final transparent DTF master must be derived to RGBA PNG.",
  },
  webp: {
    format: "webp",
    masterOutputAllowed: false,
    alphaTransfer: "linear",
    colorTransferManaged: true,
    supportsMultipleFrames: true,
    masterRule:
      "WebP is accepted as a source. Because lossy RGB with alpha is possible, final print master is regenerated as lossless RGBA PNG after QA.",
  },
  tif: {
    format: "tif",
    masterOutputAllowed: false,
    alphaTransfer: "linear",
    colorTransferManaged: true,
    supportsMultipleFrames: true,
    masterRule:
      "TIFF alpha association and pages must be inspected explicitly; final portable DTF master is derived to one RGBA PNG frame.",
  },
  tiff: {
    format: "tiff",
    masterOutputAllowed: false,
    alphaTransfer: "linear",
    colorTransferManaged: true,
    supportsMultipleFrames: true,
    masterRule:
      "TIFF alpha association and pages must be inspected explicitly; final portable DTF master is derived to one RGBA PNG frame.",
  },
};

export const PNG_COLOR_METADATA_PRECEDENCE = ["cICP", "iCCP", "sRGB", "cHRM+gAMA"] as const;

export function getFormatProcessingPolicy(format: string): FormatProcessingPolicy | null {
  return FORMAT_POLICIES[format.toLowerCase()] ?? null;
}
