import { isAbsolute } from "node:path";

export interface LocalProcessSpec {
  id: string;
  executablePath: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  extraEnv?: Record<string, string>;
}

export interface LocalProcessResult {
  id: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const REMOTE_ARG = /^(?:https?|ftp|file):\/\//i;

export function assertLocalProcessSpec(spec: LocalProcessSpec): void {
  if (!spec.id.trim()) throw new Error("Local process id is required.");
  if (!isAbsolute(spec.executablePath)) {
    throw new Error("Executable path must be absolute.");
  }
  if (!isAbsolute(spec.cwd)) {
    throw new Error("Working directory must be absolute.");
  }
  if (spec.timeoutMs <= 0 || spec.timeoutMs > 60 * 60 * 1000) {
    throw new Error("Process timeout must be between 1 ms and 1 hour.");
  }
  if (spec.maxStdoutBytes <= 0 || spec.maxStderrBytes <= 0) {
    throw new Error("Process output limits must be positive.");
  }
  for (const arg of spec.args) {
    if (REMOTE_ARG.test(arg.trim())) {
      throw new Error(`Remote URL argument is forbidden in local runner: ${arg}`);
    }
  }
}

export function buildOfflineProcessEnvironment(
  extra: Record<string, string> = {},
): Record<string, string> {
  const inherited: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value == null) continue;
    const upper = key.toUpperCase();
    if (
      upper === "HTTP_PROXY" ||
      upper === "HTTPS_PROXY" ||
      upper === "ALL_PROXY" ||
      upper === "FTP_PROXY" ||
      upper === "HF_TOKEN" ||
      upper === "HUGGING_FACE_HUB_TOKEN"
    ) {
      continue;
    }
    inherited[key] = value;
  }

  return {
    ...inherited,
    ...extra,
    HF_HUB_OFFLINE: "1",
    HF_HUB_DISABLE_IMPLICIT_TOKEN: "1",
    HF_HUB_DISABLE_TELEMETRY: "1",
    TRANSFORMERS_OFFLINE: "1",
    HF_DATASETS_OFFLINE: "1",
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: "1",
    NO_PROXY: "*",
    no_proxy: "*",
  };
}

async function readLimitedText(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("output limit exceeded");
      throw new Error(`Local process output exceeded ${maxBytes} bytes.`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

export async function runLocalProcess(
  spec: LocalProcessSpec,
): Promise<LocalProcessResult> {
  assertLocalProcessSpec(spec);

  const child = Bun.spawn({
    cmd: [spec.executablePath, ...spec.args],
    cwd: spec.cwd,
    env: buildOfflineProcessEnvironment(spec.extraEnv),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, spec.timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      readLimitedText(child.stdout, spec.maxStdoutBytes),
      readLimitedText(child.stderr, spec.maxStderrBytes),
      child.exited,
    ]);

    return {
      id: spec.id,
      exitCode,
      stdout,
      stderr,
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}
