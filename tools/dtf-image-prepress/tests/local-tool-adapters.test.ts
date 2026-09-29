import { describe, expect, test } from "bun:test";
import {
  buildRealEsrganNcnnSpec,
  buildResvgSpec,
  buildTesseractTsvSpec,
  buildVTracerSpec,
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
