import { dirname, isAbsolute } from "node:path";
import { assertLocalModelPath } from "./local-adapter-policy";
import type { LocalProcessSpec } from "./local-process-runner";

function baseSpec(input: {
  id: string;
  executablePath: string;
  args: string[];
  cwd: string;
  timeoutMs?: number;
}): LocalProcessSpec {
  return {
    id: input.id,
    executablePath: input.executablePath,
    args: input.args,
    cwd: input.cwd,
    timeoutMs: input.timeoutMs ?? 120_000,
    maxStdoutBytes: 4 * 1024 * 1024,
    maxStderrBytes: 4 * 1024 * 1024,
  };
}

function requireAbsoluteFile(path: string, label: string): string {
  if (!isAbsolute(path)) throw new Error(`${label} must be an absolute local path.`);
  return path;
}

export function buildVTracerSpec(input: {
  executablePath: string;
  sourcePath: string;
  outputSvgPath: string;
  preset: "bw" | "poster" | "photo";
  seamFreeCutout?: boolean;
}): LocalProcessSpec {
  requireAbsoluteFile(input.sourcePath, "VTracer source");
  requireAbsoluteFile(input.outputSvgPath, "VTracer output");
  const args = [
    input.sourcePath,
    input.outputSvgPath,
    "--preset",
    input.preset,
  ];
  if (input.seamFreeCutout) args.push("--hierarchical", "cutout");
  return baseSpec({
    id: "vtracer",
    executablePath: input.executablePath,
    args,
    cwd: dirname(input.outputSvgPath),
  });
}

export function buildResvgSpec(input: {
  executablePath: string;
  svgPath: string;
  outputPngPath: string;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
}): LocalProcessSpec {
  requireAbsoluteFile(input.svgPath, "resvg source");
  requireAbsoluteFile(input.outputPngPath, "resvg output");
  const args: string[] = [];
  if (input.widthPx != null) args.push("--width", String(Math.round(input.widthPx)));
  if (input.heightPx != null) args.push("--height", String(Math.round(input.heightPx)));
  if (input.dpi != null) args.push("--dpi", String(Math.round(input.dpi)));
  args.push(input.svgPath, input.outputPngPath);
  return baseSpec({
    id: "resvg",
    executablePath: input.executablePath,
    args,
    cwd: dirname(input.outputPngPath),
  });
}

export function buildTesseractTsvSpec(input: {
  executablePath: string;
  sourcePath: string;
  tessdataDir: string;
  languages?: string;
  psm?: number;
  dpi?: number;
}): LocalProcessSpec {
  requireAbsoluteFile(input.sourcePath, "Tesseract source");
  requireAbsoluteFile(input.tessdataDir, "Tesseract tessdata directory");
  const psm = input.psm ?? 6;
  if (!Number.isInteger(psm) || psm < 0 || psm > 13) {
    throw new Error("Tesseract PSM must be an integer between 0 and 13.");
  }
  const args = [
    input.sourcePath,
    "stdout",
    "--tessdata-dir",
    input.tessdataDir,
    "-l",
    input.languages ?? "ara+eng",
    "--psm",
    String(psm),
  ];
  if (input.dpi != null) args.push("--dpi", String(Math.round(input.dpi)));
  args.push("tsv");
  return baseSpec({
    id: "tesseract-tsv",
    executablePath: input.executablePath,
    args,
    cwd: dirname(input.sourcePath),
    timeoutMs: 60_000,
  });
}

export interface TesseractWord {
  text: string;
  confidence: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TesseractTsvSummary {
  text: string;
  confidence: number;
  words: TesseractWord[];
}

export function parseTesseractTsv(tsv: string): TesseractTsvSummary {
  const lines = tsv.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length === 0) return { text: "", confidence: 0, words: [] };
  const header = lines[0].split("\t");
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const required = ["level", "left", "top", "width", "height", "conf", "text"];
  for (const field of required) {
    if (index[field] == null) throw new Error(`Tesseract TSV missing field: ${field}`);
  }

  const words: TesseractWord[] = [];
  for (const line of lines.slice(1)) {
    const fields = line.split("\t");
    if (fields[index.level] !== "5") continue;
    const text = (fields[index.text] ?? "").trim();
    const confidence = Number(fields[index.conf]);
    if (!text || !Number.isFinite(confidence) || confidence < 0) continue;
    words.push({
      text,
      confidence: Math.max(0, Math.min(1, confidence / 100)),
      left: Number(fields[index.left]) || 0,
      top: Number(fields[index.top]) || 0,
      width: Number(fields[index.width]) || 0,
      height: Number(fields[index.height]) || 0,
    });
  }

  const confidence =
    words.length === 0
      ? 0
      : words.reduce((sum, word) => sum + word.confidence, 0) / words.length;

  return {
    text: words.map((word) => word.text).join(" "),
    confidence,
    words,
  };
}

const REAL_ESRGAN_MODELS = new Set([
  "realesrgan-x4plus",
  "realesrgan-x4plus-anime",
  "realesrnet-x4plus",
  "realesr-animevideov3",
]);

export function buildRealEsrganNcnnSpec(input: {
  executablePath: string;
  sourcePath: string;
  outputPath: string;
  modelDirectory: string;
  modelName: string;
  scale: 2 | 3 | 4;
  tileSize?: number;
  gpuId?: number;
}): LocalProcessSpec {
  requireAbsoluteFile(input.sourcePath, "Real-ESRGAN source");
  requireAbsoluteFile(input.outputPath, "Real-ESRGAN output");
  const modelDirectory = assertLocalModelPath(input.modelDirectory);
  if (!REAL_ESRGAN_MODELS.has(input.modelName)) {
    throw new Error(`Unsupported Real-ESRGAN NCNN model name: ${input.modelName}`);
  }
  const tileSize = input.tileSize ?? 0;
  if (tileSize !== 0 && tileSize < 32) {
    throw new Error("Real-ESRGAN tile size must be 0 (auto) or at least 32.");
  }

  const args = [
    "-i",
    input.sourcePath,
    "-o",
    input.outputPath,
    "-m",
    modelDirectory,
    "-n",
    input.modelName,
    "-s",
    String(input.scale),
    "-t",
    String(tileSize),
    "-f",
    "png",
  ];
  if (input.gpuId != null) args.push("-g", String(input.gpuId));

  return baseSpec({
    id: "realesrgan-ncnn-vulkan",
    executablePath: input.executablePath,
    args,
    cwd: dirname(input.outputPath),
    timeoutMs: 10 * 60_000,
  });
}
