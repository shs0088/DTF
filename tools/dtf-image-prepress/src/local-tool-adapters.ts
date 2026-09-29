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


export function buildPaddleOcrLocalSpec(input: {
  pythonExecutablePath: string;
  wrapperScriptPath: string;
  sourcePath: string;
  outputJsonPath: string;
  detectionModelDirectory: string;
  recognitionModelDirectory: string;
  device?: string;
  recognitionScoreThreshold?: number;
}): LocalProcessSpec {
  requireAbsoluteFile(input.wrapperScriptPath, "PaddleOCR wrapper");
  requireAbsoluteFile(input.sourcePath, "PaddleOCR source");
  requireAbsoluteFile(input.outputJsonPath, "PaddleOCR output");
  const detectionModelDirectory = assertLocalModelPath(input.detectionModelDirectory);
  const recognitionModelDirectory = assertLocalModelPath(input.recognitionModelDirectory);
  const threshold = input.recognitionScoreThreshold ?? 0;
  if (threshold < 0 || threshold > 1) {
    throw new Error("PaddleOCR recognition score threshold must be between 0 and 1.");
  }

  return baseSpec({
    id: "paddleocr-local",
    executablePath: input.pythonExecutablePath,
    args: [
      input.wrapperScriptPath,
      "--input",
      input.sourcePath,
      "--output-json",
      input.outputJsonPath,
      "--det-model-dir",
      detectionModelDirectory,
      "--rec-model-dir",
      recognitionModelDirectory,
      "--device",
      input.device ?? "cpu",
      "--rec-score-thresh",
      String(threshold),
    ],
    cwd: dirname(input.outputJsonPath),
    timeoutMs: 120_000,
  });
}

export interface PaddleOcrNormalizedPage {
  texts: string[];
  scores: number[];
  boxes: number[][];
  polys: number[][][];
  detection_scores: number[];
}

export interface PaddleOcrNormalizedResult {
  engine: "paddleocr";
  input: string;
  pages: PaddleOcrNormalizedPage[];
}

export function parsePaddleOcrNormalizedJson(value: string): PaddleOcrNormalizedResult {
  const parsed = JSON.parse(value) as PaddleOcrNormalizedResult;
  if (parsed.engine !== "paddleocr" || !Array.isArray(parsed.pages)) {
    throw new Error("Invalid normalized PaddleOCR JSON.");
  }
  for (const page of parsed.pages) {
    if (!Array.isArray(page.texts) || !Array.isArray(page.scores)) {
      throw new Error("Invalid PaddleOCR page result.");
    }
    if (page.texts.length !== page.scores.length) {
      throw new Error("PaddleOCR text/score count mismatch.");
    }
  }
  return parsed;
}


export function buildBen2OnnxLocalSpec(input: {
  pythonExecutablePath: string;
  wrapperScriptPath: string;
  modelPath: string;
  sourcePath: string;
  outputMaskPath: string;
  outputJsonPath: string;
  device?: "cpu" | "cuda";
}): LocalProcessSpec {
  requireAbsoluteFile(input.wrapperScriptPath, "BEN2 wrapper");
  requireAbsoluteFile(input.sourcePath, "BEN2 source");
  requireAbsoluteFile(input.outputMaskPath, "BEN2 output mask");
  requireAbsoluteFile(input.outputJsonPath, "BEN2 output JSON");
  const modelPath = assertLocalModelPath(input.modelPath);
  if (!modelPath.toLowerCase().endsWith(".onnx")) {
    throw new Error("BEN2 production adapter accepts an ONNX model path only.");
  }

  return baseSpec({
    id: "ben2-onnx-local",
    executablePath: input.pythonExecutablePath,
    args: [
      input.wrapperScriptPath,
      "--model",
      modelPath,
      "--input",
      input.sourcePath,
      "--output-mask",
      input.outputMaskPath,
      "--output-json",
      input.outputJsonPath,
      "--device",
      input.device ?? "cpu",
    ],
    cwd: dirname(input.outputMaskPath),
    timeoutMs: 180_000,
  });
}

export interface Ben2OnnxLocalReport {
  engine: "ben2-onnx";
  model_path: string;
  input_path: string;
  output_mask: string;
  input_name: string;
  declared_input_shape: Array<number | string | null>;
  runtime_input_shape: number[];
  output_shape: number[];
  original_size: number[];
  preprocess: {
    resize: [number, number];
    rgb: boolean;
    scale: string;
    mean_std_normalization: boolean;
  };
  postprocess: {
    min: number;
    max: number;
    normalization: string;
    resize_to_original: boolean;
  };
  providers: string[];
}

export function parseBen2OnnxLocalReport(value: string): Ben2OnnxLocalReport {
  const parsed = JSON.parse(value) as Ben2OnnxLocalReport;
  if (parsed.engine !== "ben2-onnx") {
    throw new Error("Invalid BEN2 ONNX local report.");
  }
  if (
    parsed.preprocess?.resize?.[0] !== 1024 ||
    parsed.preprocess?.resize?.[1] !== 1024 ||
    parsed.preprocess?.mean_std_normalization !== false
  ) {
    throw new Error("BEN2 preprocessing report does not match the pinned local adapter contract.");
  }
  if (!Array.isArray(parsed.providers) || parsed.providers.length === 0) {
    throw new Error("BEN2 report must include the local ONNX Runtime provider list.");
  }
  return parsed;
}


export function buildPyMattingForegroundSpec(input: {
  pythonExecutablePath: string;
  wrapperScriptPath: string;
  sourcePath: string;
  alphaMaskPath: string;
  outputRgbaPath: string;
  outputJsonPath: string;
  regularization?: number;
}): LocalProcessSpec {
  requireAbsoluteFile(input.wrapperScriptPath, "PyMatting wrapper");
  requireAbsoluteFile(input.sourcePath, "PyMatting source");
  requireAbsoluteFile(input.alphaMaskPath, "PyMatting alpha mask");
  requireAbsoluteFile(input.outputRgbaPath, "PyMatting RGBA output");
  requireAbsoluteFile(input.outputJsonPath, "PyMatting report output");
  const regularization = input.regularization ?? 1e-5;
  if (!Number.isFinite(regularization) || regularization <= 0) {
    throw new Error("PyMatting regularization must be positive and finite.");
  }

  return baseSpec({
    id: "pymatting-foreground-local",
    executablePath: input.pythonExecutablePath,
    args: [
      input.wrapperScriptPath,
      "--input",
      input.sourcePath,
      "--alpha",
      input.alphaMaskPath,
      "--output-rgba",
      input.outputRgbaPath,
      "--output-json",
      input.outputJsonPath,
      "--regularization",
      String(regularization),
    ],
    cwd: dirname(input.outputRgbaPath),
    timeoutMs: 300_000,
  });
}

export interface PyMattingForegroundReport {
  engine: "pymatting-foreground-ml";
  input: string;
  alpha: string;
  output_rgba: string;
  size: [number, number];
  regularization: number;
  semi_transparent_ratio: number;
  alpha_preserved: boolean;
  foreground_rgb_reconstructed: boolean;
  output_alpha_mode: "straight-unassociated";
}

export function parsePyMattingForegroundReport(value: string): PyMattingForegroundReport {
  const parsed = JSON.parse(value) as PyMattingForegroundReport;
  if (parsed.engine !== "pymatting-foreground-ml") {
    throw new Error("Invalid PyMatting foreground report.");
  }
  if (
    parsed.alpha_preserved !== true ||
    parsed.foreground_rgb_reconstructed !== true ||
    parsed.output_alpha_mode !== "straight-unassociated"
  ) {
    throw new Error("PyMatting report violates foreground/alpha preservation contract.");
  }
  return parsed;
}
