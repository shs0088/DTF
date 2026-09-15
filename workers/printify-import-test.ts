import { ItemStore, normalizePrintifyVariant } from "./item-store";

export { ItemStore };

interface Env {
  ITEMS: DurableObjectNamespace<ItemStore>;
  PRINTIFY_API_TOKEN: string;
}

async function printifyGet(env: Env, path: string): Promise<any> {
  const response = await fetch(`https://api.printify.com${path}`, {
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
      Accept: "application/json",
      "User-Agent": "DTF-Studio-Printify-Import-Test",
    },
  });
  if (!response.ok) {
    throw new Error(`Printify request failed: ${response.status} ${path}`);
  }
  return response.json();
}

function providerList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function variantList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.variants)) return payload.variants;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/test") return new Response("Not found", { status: 404 });

    const blueprintId = "5";
    const store = env.ITEMS.get(env.ITEMS.idFromName(`printify-import-test-${crypto.randomUUID()}`));

    try {
      const detail = await printifyGet(env, `/v1/catalog/blueprints/${blueprintId}.json`);
      const providersPayload = await printifyGet(env, `/v1/catalog/blueprints/${blueprintId}/print_providers.json`);
      const providers = providerList(providersPayload);
      const provider = providers.find((row: any) => row?.id != null);
      if (!provider) throw new Error("No Printify provider found for test blueprint.");

      const providerId = String(provider.id);
      const variantsPayload = await printifyGet(
        env,
        `/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json?show-out-of-stock=true`,
      );
      const normalizedVariants = variantList(variantsPayload)
        .map((row: any) => normalizePrintifyVariant(blueprintId, providerId, row))
        .filter(Boolean);

      if (normalizedVariants.length === 0) throw new Error("No valid variants returned for test product.");

      await store.upsertPrintifyCatalogItem({
        blueprintId,
        title: String(detail?.title ?? ""),
        description: String(detail?.description ?? ""),
        productType: String(detail?.model ?? ""),
        providerId,
        source: { detail, providers },
        variants: normalizedVariants,
        images: Array.isArray(detail?.images) ? detail.images : [],
        sourceAvailable: true,
        syncStatus: "synced",
      });

      const beforeFirst = await store.printifyItem(blueprintId) as any;
      const first = beforeFirst?.imported_model_id
        ? { status: "skipped", reason: "already_imported", modelId: beforeFirst.imported_model_id }
        : {
            status: "imported",
            item: await store.importPrintify(blueprintId, providerId) as any,
          };

      const afterFirst = await store.printifyItem(blueprintId) as any;
      const fingerprintBeforeSecond = JSON.stringify(afterFirst);

      const second = afterFirst?.imported_model_id
        ? { status: "skipped", reason: "already_imported", modelId: afterFirst.imported_model_id }
        : {
            status: "imported",
            item: await store.importPrintify(blueprintId, providerId) as any,
          };

      const afterSecond = await store.printifyItem(blueprintId) as any;
      const fingerprintAfterSecond = JSON.stringify(afterSecond);

      const ok =
        first.status === "imported" &&
        !!afterFirst?.imported_model_id &&
        second.status === "skipped" &&
        second.reason === "already_imported" &&
        fingerprintBeforeSecond === fingerprintAfterSecond;

      return Response.json({
        ok,
        blueprintId,
        title: String(detail?.title ?? ""),
        providerId,
        normalizedVariantCount: normalizedVariants.length,
        modelId: afterFirst?.imported_model_id ?? null,
        first: { status: first.status },
        second,
        unchangedOnSecondAttempt: fingerprintBeforeSecond === fingerprintAfterSecond,
        published: Number(afterSecond?.published ?? 0) === 1,
      }, { status: ok ? 200 : 500 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown test failure";
      console.error("PRINTIFY_IMPORT_TEST_FAILURE", message);
      return Response.json(
        { ok: false, error: message },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<Env>;
