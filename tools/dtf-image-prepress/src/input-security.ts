import { stat } from "node:fs/promises";
import sharp from "sharp";

export interface InputSecurityPolicy {
  maxInputBytes: number;
  maxPixels: number;
  maxDimension: number;
  maxChannels: number;
  maxFrames: number;
  failOn: "warning";
  unlimited: false;
  sequentialRead: true;
}

export const DEFAULT_INPUT_SECURITY_POLICY: InputSecurityPolicy = {
  maxInputBytes: 100 * 1024 * 1024,
  // Operational safety limit, not a DTF print standard.
  // 120 MP still covers roughly 16x18 inches at 600 PPI.
  maxPixels: 120_000_000,
  maxDimension: 20_000,
  maxChannels: 5,
  maxFrames: 32,
  failOn: "warning",
  unlimited: false,
  sequentialRead: true,
};

export interface InputSecurityResult {
  allowed: boolean;
  failures: string[];
  warnings: string[];
  metadata: {
    format?: string;
    mediaType?: string;
    width?: number;
    height?: number;
    channels?: number;
    pages?: number;
    byteSize: number;
  };
}

export async function inspectInputSecurity(
  path: string,
  policy: InputSecurityPolicy = DEFAULT_INPUT_SECURITY_POLICY,
): Promise<InputSecurityResult> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const file = await stat(path);

  if (file.size <= 0) failures.push("Input file is empty.");
  if (file.size > policy.maxInputBytes) {
    failures.push(`Input byte size ${file.size} exceeds policy limit ${policy.maxInputBytes}.`);
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(path, {
      failOn: policy.failOn,
      limitInputPixels: policy.maxPixels,
      limitInputChannels: policy.maxChannels,
      unlimited: policy.unlimited,
      sequentialRead: policy.sequentialRead,
      pages: 1,
    }).metadata();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown decoder failure.";
    failures.push(`Secure header inspection failed: ${message}`);
    return {
      allowed: false,
      failures,
      warnings,
      metadata: { byteSize: file.size },
    };
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const pixels = width * height;
  const pages = metadata.pages ?? 1;
  const channels = metadata.channels ?? 0;

  if (width <= 0 || height <= 0) failures.push("Input dimensions are invalid.");
  if (width > policy.maxDimension || height > policy.maxDimension) {
    failures.push(
      `Input dimensions ${width}x${height} exceed maximum dimension ${policy.maxDimension}.`,
    );
  }
  if (pixels > policy.maxPixels) {
    failures.push(`Input pixel count ${pixels} exceeds policy limit ${policy.maxPixels}.`);
  }
  if (channels > policy.maxChannels) {
    failures.push(`Input has ${channels} channels; policy limit is ${policy.maxChannels}.`);
  }
  if (pages > policy.maxFrames) {
    failures.push(`Input contains ${pages} frames/pages; safety limit is ${policy.maxFrames}.`);
  } else if (pages > 1) {
    warnings.push(
      `Input contains ${pages} frames/pages; direct master approval still requires one explicit frame.`,
    );
  }

  return {
    allowed: failures.length === 0,
    failures,
    warnings,
    metadata: {
      format: metadata.format,
      mediaType: metadata.mediaType,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      pages,
      byteSize: file.size,
    },
  };
}

export interface OfflineSvgInspection {
  allowed: boolean;
  failures: string[];
}

export function inspectSvgOfflineSafety(svgText: string): OfflineSvgInspection {
  const failures: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/<\s*script\b/i, "SVG scripts are not allowed."],
    [/<\s*foreignObject\b/i, "SVG foreignObject content is not allowed."],
    [/<!DOCTYPE\b/i, "SVG DOCTYPE declarations are not allowed."],
    [/<!ENTITY\b/i, "SVG entity declarations are not allowed."],
    [/(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|file:|ftp:|\/\/)/i, "SVG external references are not allowed."],
    [/url\(\s*["']?\s*(?:https?:|file:|ftp:|\/\/)/i, "SVG CSS external URLs are not allowed."],
    [/@import\s+(?:url\()?\s*["']?\s*(?:https?:|file:|ftp:|\/\/)/i, "SVG stylesheet imports are not allowed."],
  ];

  for (const [pattern, message] of patterns) {
    if (pattern.test(svgText)) failures.push(message);
  }

  return { allowed: failures.length === 0, failures };
}
