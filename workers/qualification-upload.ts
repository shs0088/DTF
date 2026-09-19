import { analyzeAsset, type AnalyzerResult } from "./analyzer";

export const QUALIFICATION_MAX_BYTES = 50 * 1024 * 1024;
export const QUALIFICATION_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "pdf"] as const;

export type QualificationFileCheck = {
  filename: string;
  mime: string;
  byteSize: number;
  format: string;
  signatureValid: boolean;
  pixelWidth: number;
  pixelHeight: number;
  previewable: boolean;
  analyzer: AnalyzerResult;
};

export type QualificationSlotInput = { files: QualificationFileCheck[] };

export function safeQualificationFilename(filename: string): string {
  const raw = String(filename || "").trim();
  if (!raw || raw.includes("..") || /[\\/\0\r\n]/.test(raw)) throw new Error("Filename is invalid.");
  const value = raw.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 240);
  if (!value || value === "." || value === "..") throw new Error("Filename is invalid.");
  return value;
}

export function qualificationFormat(filename: string): string {
  const match = safeQualificationFilename(filename).toLowerCase().match(/\.([a-z0-9]+)$/);
  const format = match?.[1] || "";
  if (!(QUALIFICATION_EXTENSIONS as readonly string[]).includes(format)) throw new Error("Unsupported qualification file format.");
  return format;
}

export function qualificationSignature(format: string, bytes: Uint8Array): boolean {
  if (format === "png") return bytes.length >= 8 && bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i]);
  if (format === "jpg" || format === "jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (format === "webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (format === "pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (format === "svg") return /<svg(?:\s|>)/i.test(new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096))));
  return false;
}

function dimensions(format: string, bytes: Uint8Array): { width: number; height: number } {
  if (format === "png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (format === "webp" && bytes.length >= 30 && new TextDecoder().decode(bytes.slice(12, 16)) === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
  if (format === "svg") return { width: 3000, height: 3000 };
  return { width: 0, height: 0 };
}

export function inspectQualificationFile(file: { name: string; type: string; bytes: Uint8Array }): QualificationFileCheck {
  const filename = safeQualificationFilename(file.name);
  const format = qualificationFormat(filename);
  if (file.bytes.byteLength <= 0 || file.bytes.byteLength > QUALIFICATION_MAX_BYTES) throw new Error("Qualification files must be between 1 byte and 50 MB.");
  const signatureValid = qualificationSignature(format, file.bytes);
  const { width, height } = dimensions(format, file.bytes);
  const previewable = format !== "pdf" || file.bytes.byteLength > 5;
  const analyzer = analyzeAsset({ format, mime: file.type || "application/octet-stream", signatureValid, byteSize: file.bytes.byteLength, pixelWidth: width, pixelHeight: height, intendedWidthIn: 10, intendedHeightIn: 10, previewable });
  if (!signatureValid) throw new Error("File signature does not match its extension.");
  if (!analyzer.readable || !analyzer.analyzable) throw new Error(analyzer.errors.join(" ") || "File could not be analyzed.");
  return { filename, mime: file.type || "application/octet-stream", byteSize: file.bytes.byteLength, format, signatureValid, pixelWidth: width, pixelHeight: height, previewable, analyzer };
}

export function assertExactlyThreeQualificationSlots(slots: unknown): asserts slots is QualificationSlotInput[] {
  if (!Array.isArray(slots) || slots.length !== 3) throw new Error("Qualification submission requires exactly 3 design slots.");
  if (slots.some((slot) => !slot || !Array.isArray(slot.files) || slot.files.length === 0)) throw new Error("Each qualification design must contain at least one uploaded file.");
  if (slots.some((slot) => slot.files.some((file) => !file.signatureValid || !file.analyzer.passed))) throw new Error("All qualification files must pass automatic preflight.");
}

export function qualificationObjectKey(userId: string, applicationId: string, slot: number, assetId: string, filename: string): string {
  const safe = (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
  return `qualification/${safe(userId)}/${safe(applicationId)}/slot-${slot}/${safe(assetId)}-${safeQualificationFilename(filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}
