import { describe, expect, test } from "bun:test";
import {
  assertLocalProcessSpec,
  buildOfflineProcessEnvironment,
} from "../src/local-process-runner";

describe("local process runner policy", () => {
  test("forces common ML libraries into offline mode", () => {
    const env = buildOfflineProcessEnvironment();
    expect(env.HF_HUB_OFFLINE).toBe("1");
    expect(env.TRANSFORMERS_OFFLINE).toBe("1");
    expect(env.HF_DATASETS_OFFLINE).toBe("1");
    expect(env.PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK).toBe("1");
    expect(env.NO_PROXY).toBe("*");
  });

  test("rejects remote URL arguments and relative executables", () => {
    expect(() =>
      assertLocalProcessSpec({
        id: "bad",
        executablePath: "python",
        args: [],
        cwd: "/tmp",
        timeoutMs: 1000,
        maxStdoutBytes: 1000,
        maxStderrBytes: 1000,
      }),
    ).toThrow("absolute");

    expect(() =>
      assertLocalProcessSpec({
        id: "bad-url",
        executablePath: "/usr/bin/python3",
        args: ["https://example.com/model.onnx"],
        cwd: "/tmp",
        timeoutMs: 1000,
        maxStdoutBytes: 1000,
        maxStderrBytes: 1000,
      }),
    ).toThrow("Remote URL argument");
  });

  test("accepts only local absolute command inputs", () => {
    expect(() =>
      assertLocalProcessSpec({
        id: "local",
        executablePath: "/opt/dtf/bin/vtracer",
        args: ["/var/lib/dtf/input.png", "--output", "/var/lib/dtf/output.svg"],
        cwd: "/var/lib/dtf",
        timeoutMs: 60_000,
        maxStdoutBytes: 1_000_000,
        maxStderrBytes: 1_000_000,
      }),
    ).not.toThrow();
  });
});
