import { describe, expect, test } from "bun:test";
import {
  buildBen2OnnxLocalSpec,
  buildPaddleOcrLocalSpec,
  buildPyMattingForegroundSpec,
  buildRealEsrganNcnnSpec,
  buildResvgSpec,
  buildTesseractTsvSpec,
  buildVTracerSpec,
  parseBen2OnnxLocalReport,
  parsePaddleOcrNormalizedJson,
  parsePyMattingForegroundReport,
  parseTesseractTsv,
} from "../src/local-tool-adapters";
import { assertLocalProcessSpec } from "../src/local-process-runner";

describe("local tool adapters", () => {
  test("builds VTracer and resvg without shell commands or URLs", () => {
    const trace = buildVTracerSpec({
      executablePath: "/opt/dtf/bin/vtracer",
      sourcePath: "/work/source.png",
      outputSvgPath: "/work/candidate.svg",
      preset: "poster",
      seamFreeCutout: true,
    });
    expect(trace.args).toContain("--hierarchical");
    expect(trace.args).toContain("cutout");
    expect(() => assertLocalProcessSpec(trace)).not.toThrow();

    const render = buildResvgSpec({
      executablePath: "/opt/dtf/bin/resvg",
      svgPath: "/work/candidate.svg",
      outputPngPath: "/work/candidate.png",
      widthPx: 4800,
      dpi: 300,
    });
    expect(render.args).toContain("4800");
    expect(() => assertLocalProcessSpec(render)).not.toThrow();
  });

  test("builds Arabic+English Tesseract TSV command", () => {
    const spec = buildTesseractTsvSpec({
      executablePath: "/usr/bin/tesseract",
      sourcePath: "/work/source.png",
      tessdataDir: "/opt/dtf/tessdata",
      languages: "ara+eng",
      psm: 6,
      dpi: 300,
    });
    expect(spec.args).toContain("ara+eng");
    expect(spec.args.at(-1)).toBe("tsv");
  });

  test("parses Tesseract word confidence", () => {
    const tsv = [
      "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
      "5\t1\t1\t1\t1\t1\t10\t20\t100\t30\t96.0\tاطبع",
      "5\t1\t1\t1\t1\t2\t120\t20\t100\t30\t90.0\tحلمك",
    ].join("\n");
    const result = parseTesseractTsv(tsv);
    expect(result.text).toBe("اطبع حلمك");
    expect(result.confidence).toBeCloseTo(0.93, 4);
    expect(result.words).toHaveLength(2);
  });

  test("builds BEN2 ONNX only from an explicit local model path", () => {
    const spec = buildBen2OnnxLocalSpec({
      pythonExecutablePath: "/opt/dtf/python/bin/python3",
      wrapperScriptPath: "/opt/dtf/adapters/ben2_onnx_local.py",
      modelPath: "/opt/dtf/models/ben2/BEN2_Base.onnx",
      sourcePath: "/work/source.png",
      outputMaskPath: "/work/ben2-mask.png",
      outputJsonPath: "/work/ben2.json",
      device: "cpu",
    });
    expect(spec.args).toContain("/opt/dtf/models/ben2/BEN2_Base.onnx");
    expect(() => assertLocalProcessSpec(spec)).not.toThrow();

    const parsed = parseBen2OnnxLocalReport(
      JSON.stringify({
        engine: "ben2-onnx",
        model_path: "/opt/dtf/models/ben2/BEN2_Base.onnx",
        input_path: "/work/source.png",
        output_mask: "/work/ben2-mask.png",
        input_name: "input",
        declared_input_shape: [1, 3, 1024, 1024],
        runtime_input_shape: [1, 3, 1024, 1024],
        output_shape: [1, 1, 1024, 1024],
        original_size: [4800, 5400],
        preprocess: {
          resize: [1024, 1024],
          rgb: true,
          scale: "uint8/255",
          mean_std_normalization: false,
        },
        postprocess: {
          min: 0,
          max: 1,
          normalization: "min-max",
          resize_to_original: true,
        },
        providers: ["CPUExecutionProvider"],
      }),
    );
    expect(parsed.preprocess.mean_std_normalization).toBe(false);
  });

  test("builds PyMatting foreground reconstruction without changing alpha contract", () => {
    const spec = buildPyMattingForegroundSpec({
      pythonExecutablePath: "/opt/dtf/python/bin/python3",
      wrapperScriptPath: "/opt/dtf/adapters/pymatting_foreground_local.py",
      sourcePath: "/work/source.png",
      alphaMaskPath: "/work/alpha.png",
      outputRgbaPath: "/work/foreground.png",
      outputJsonPath: "/work/foreground.json",
    });
    expect(() => assertLocalProcessSpec(spec)).not.toThrow();

    const parsed = parsePyMattingForegroundReport(
      JSON.stringify({
        engine: "pymatting-foreground-ml",
        input: "/work/source.png",
        alpha: "/work/alpha.png",
        output_rgba: "/work/foreground.png",
        size: [4800, 5400],
        regularization: 0.00001,
        semi_transparent_ratio: 0.04,
        alpha_preserved: true,
        foreground_rgb_reconstructed: true,
        output_alpha_mode: "straight-unassociated",
      }),
    );
    expect(parsed.alpha_preserved).toBe(true);
  });

  test("builds PaddleOCR only with explicit local model directories", () => {
    const spec = buildPaddleOcrLocalSpec({
      pythonExecutablePath: "/opt/dtf/python/bin/python3",
      wrapperScriptPath: "/opt/dtf/adapters/paddleocr_local.py",
      sourcePath: "/work/source.png",
      outputJsonPath: "/work/paddle.json",
      detectionModelDirectory: "/opt/dtf/models/ppocr-det",
      recognitionModelDirectory: "/opt/dtf/models/ppocr-arabic-rec",
      device: "cpu",
    });
    expect(spec.args).toContain("--det-model-dir");
    expect(spec.args).toContain("/opt/dtf/models/ppocr-det");
    expect(spec.args).toContain("--rec-model-dir");
    expect(() => assertLocalProcessSpec(spec)).not.toThrow();

    const parsed = parsePaddleOcrNormalizedJson(
      JSON.stringify({
        engine: "paddleocr",
        input: "/work/source.png",
        pages: [{
          texts: ["اطبع", "حلمك"],
          scores: [0.98, 0.96],
          boxes: [[1,2,3,4], [5,6,7,8]],
          polys: [],
          detection_scores: [0.95, 0.94],
        }],
      }),
    );
    expect(parsed.pages[0].texts.join(" ")).toBe("اطبع حلمك");
  });

  test("builds only known local Real-ESRGAN NCNN models", () => {
    const spec = buildRealEsrganNcnnSpec({
      executablePath: "/opt/dtf/bin/realesrgan-ncnn-vulkan",
      sourcePath: "/work/source.png",
      outputPath: "/work/upscaled.png",
      modelDirectory: "/opt/dtf/models/realesrgan",
      modelName: "realesrgan-x4plus",
      scale: 4,
      tileSize: 256,
    });
    expect(spec.args).toContain("-m");
    expect(spec.args).toContain("/opt/dtf/models/realesrgan");
    expect(() => assertLocalProcessSpec(spec)).not.toThrow();

    expect(() =>
      buildRealEsrganNcnnSpec({
        executablePath: "/opt/dtf/bin/realesrgan-ncnn-vulkan",
        sourcePath: "/work/source.png",
        outputPath: "/work/upscaled.png",
        modelDirectory: "/opt/dtf/models/realesrgan",
        modelName: "unknown-model",
        scale: 4,
      }),
    ).toThrow("Unsupported Real-ESRGAN");
  });
});
