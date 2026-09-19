import type { Route } from "./+types/api.studio.qualification";
import type { ItemStore } from "../../workers/item-store";
import { assertExactlyThreeQualificationSlots, inspectQualificationFile, type QualificationFileCheck } from "../../workers/qualification-upload";

function sessionFromCookie(request: Request): string {
  const match = String(request.headers.get("cookie") || "").match(/(?:^|;\s*)dtf_session=([^;]+)/);
  return match?.[1] || "";
}

export async function loader() {
  return Response.json({ ok: true, storage: "not_configured", submission: "unavailable", requiredDesignSlots: 3 });
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) return Response.json({ ok: false, error: "Qualification upload expects multipart/form-data." }, { status: 415 });
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  const sessionId = sessionFromCookie(request);
  const identity = await store.sessionIdentity(sessionId);
  if (!identity) return Response.json({ ok: false, error: "Designer authentication is required." }, { status: 401 });
  if (identity.role !== "designer") return Response.json({ ok: false, error: "Only authenticated Designer accounts may submit qualification designs." }, { status: 403 });

  const form = await request.formData();
  const slots: Array<{ files: QualificationFileCheck[] }> = [];
  try {
    for (let slot = 1; slot <= 3; slot++) {
      const files = form.getAll(`slot-${slot}`).filter((value): value is File => typeof File !== "undefined" && value instanceof File);
      const checked: QualificationFileCheck[] = [];
      for (const file of files) checked.push(inspectQualificationFile({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }));
      slots.push({ files: checked });
    }
    const extraSlots = [...form.keys()].filter((key) => /^slot-/.test(key) && !/^slot-[123]$/.test(key));
    if (extraSlots.length) throw new Error("Qualification submission accepts exactly 3 design slots.");
    assertExactlyThreeQualificationSlots(slots);
  } catch (error) {
    return Response.json({ ok: false, state: "rejected", error: error instanceof Error ? error.message : "Qualification files failed server validation." }, { status: 422 });
  }

  // The current project has no writable DESIGN_ASSETS/R2 binding. Do not persist
  // metadata or claim submission until an approved storage abstraction is configured.
  return Response.json({ ok: false, state: "server_error", error: "Secure qualification storage is not configured; no files were persisted and no application was submitted.", checkedSlots: slots.map((slot) => ({ fileCount: slot.files.length, preflight: slot.files.every((file) => file.analyzer.passed) ? "passed" : "failed" })) }, { status: 503 });
}
