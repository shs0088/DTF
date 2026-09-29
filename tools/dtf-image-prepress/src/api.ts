import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { analyzeSource } from "./engine";
import type { ArtworkKind } from "./contracts";
import { getResearchLedgerStatus } from "./research-ledger";
import { getRuntimeProviders, LOCAL_ONLY_EXECUTION_POLICY } from "./execution-policy";
import { MAX_SOURCE_BYTES } from "./rules";

const ALLOWED_KINDS = new Set<ArtworkKind>([
  "photo",
  "text-heavy",
  "logo-line-art",
  "mixed",
  "already-print-ready",
]);

class ValidationError extends Error {}

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function requiredPositiveNumber(form: FormData, key: string): number {
  const raw = form.get(key);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${key} must be a positive number.`);
  }
  return value;
}

function bool(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function artworkKind(form: FormData): ArtworkKind {
  const value = form.get("kind");
  if (typeof value !== "string" || !ALLOWED_KINDS.has(value as ArtworkKind)) {
    throw new ValidationError(
      "kind must be one of: photo, text-heavy, logo-line-art, mixed, already-print-ready.",
    );
  }
  return value as ArtworkKind;
}

export async function createApiHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/research/status") {
    return json(getResearchLedgerStatus());
  }

  if (request.method === "GET" && url.pathname === "/v1/providers") {
    return json({
      executionPolicy: LOCAL_ONLY_EXECUTION_POLICY,
      providers: getRuntimeProviders(),
    });
  }

  if (request.method === "GET" && url.pathname === "/health") {
    return json({
      status: "ok",
      service: "dtf-image-prepress",
      version: "0.1.0",
      opencartCoupled: false,
      adminUiIncluded: false,
      executionPolicy: LOCAL_ONLY_EXECUTION_POLICY,
    });
  }

  if (request.method === "POST" && url.pathname === "/v1/analyze") {
    let workDir: string | null = null;
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size <= 0) {
        throw new ValidationError("A non-empty file field is required.");
      }
      if (file.size > MAX_SOURCE_BYTES) {
        throw new ValidationError(
          `Uploaded file exceeds the ${Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB limit.`,
        );
      }

      const widthIn = requiredPositiveNumber(form, "widthIn");
      const heightIn = requiredPositiveNumber(form, "heightIn");
      const kind = artworkKind(form);
      const extension = extname(file.name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 12) || ".bin";

      workDir = await mkdtemp(join(tmpdir(), "dtf-prepress-"));
      await chmod(workDir, 0o700);
      const sourcePath = join(workDir, `source${extension}`);
      await Bun.write(sourcePath, file);
      await chmod(sourcePath, 0o600);

      const result = await analyzeSource({
        sourcePath,
        intent: { widthIn, heightIn },
        routing: {
          kind,
          backgroundPresent: bool(form, "backgroundPresent"),
          textDetected: bool(form, "textDetected") || kind === "text-heavy" || kind === "mixed",
          facesDetected: bool(form, "facesDetected"),
          foregroundSharesBackgroundColor: bool(form, "foregroundSharesBackgroundColor"),
          lowContrastBoundary: bool(form, "lowContrastBoundary"),
          intentionalGlowOrShadow: bool(form, "intentionalGlowOrShadow"),
        },
      });

      return json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: "invalid-request", message: error.message }, 400);
      }
      const message = error instanceof Error ? error.message : "Unexpected analysis error.";
      return json({ error: "analysis-failed", message }, 422);
    } finally {
      if (workDir) await rm(workDir, { recursive: true, force: true });
    }
  }

  return json({ error: "not-found" }, 404);
}
