import type { Route } from "./+types/api.studio.analyzer";
import { analyzeAsset, DESIGN_PRODUCT_TYPES, type AnalyzerInput } from "../../workers/analyzer";

export async function loader() {
  return Response.json({ ok: true, ruleVersion: "dtf-preflight-v1.0", minEffectiveDpi: 300, supportedProductTypes: DESIGN_PRODUCT_TYPES, allowedFormats: ["png", "jpg", "jpeg", "webp", "svg", "pdf"] });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.headers.get("content-type")?.includes("application/json") !== true) return Response.json({ ok: false, error: "Expected application/json." }, { status: 415 });
  let input: AnalyzerInput;
  try { input = await request.json() as AnalyzerInput; } catch { return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  const result = analyzeAsset(input);
  return Response.json({ ok: true, ...result }, { status: result.passed ? 200 : 422 });
}
