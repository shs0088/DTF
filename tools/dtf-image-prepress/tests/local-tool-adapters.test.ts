import { describe, expect, test } from "bun:test";
import {
  buildPaddleOcrLocalSpec,
  buildRealEsrganNcnnSpec,
  buildResvgSpec,
  buildTesseractTsvSpec,
  buildVTracerSpec,
  parsePaddleOcrNormalizedJson,
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
