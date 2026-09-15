import { readFile } from "node:fs/promises";

const token = process.env.PRINTIFY_API_TOKEN;
if (!token) throw new Error("PRINTIFY_API_TOKEN SECRET REQUIRED");

const snapshotPath = process.argv.includes("--snapshot")
  ? process.argv[process.argv.indexOf("--snapshot") + 1]
  : "public/data/printify-catalog.json";

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (!Array.isArray(snapshot?.products) || snapshot.products.length === 0) {
  throw new Error("Snapshot has no products to smoke-test.");
}

async function getJson(path) {
  const response = await fetch("https://api.printify.com" + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "User-Agent": "DTF-Studio-Selected-Product-Smoke/1.0"
    }
  });
  if (!response.ok) throw new Error(path + " failed (" + response.status + ")");
  return response.json();
}

let passed = null;
for (const product of snapshot.products.slice(0, 25)) {
  const blueprintId = String(product.blueprintId);
  const detail = await getJson(`/v1/catalog/blueprints/${blueprintId}.json`);
  const providersPayload = await getJson(`/v1/catalog/blueprints/${blueprintId}/print_providers.json`);
  const providers = Array.isArray(providersPayload) ? providersPayload : (providersPayload?.data ?? []);
  for (const provider of providers.slice(0, 10)) {
    const providerId = String(provider?.id ?? "");
    if (!/^\d+$/.test(providerId)) continue;
    const variantsPayload = await getJson(`/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json?show-out-of-stock=true`);
    const variants = Array.isArray(variantsPayload) ? variantsPayload : (variantsPayload?.variants ?? variantsPayload?.data ?? []);
    if (String(detail?.title ?? "").trim() && variants.length > 0) {
      passed = { blueprintId, providerId, variants: variants.length, title: String(detail.title).slice(0, 80) };
      break;
    }
  }
  if (passed) break;
}

if (!passed) throw new Error("No catalog product produced a valid provider + variants smoke-test.");
console.log(JSON.stringify({ ok: true, ...passed }));
