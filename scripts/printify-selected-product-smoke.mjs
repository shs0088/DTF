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

async function tryGetJson(path) {
  const response = await fetch("https://api.printify.com" + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "User-Agent": "DTF-Studio-Selected-Product-Smoke/1.0"
    }
  });
  if (!response.ok) return null;
  try { return await response.json(); } catch { return null; }
}

let passed = null;
for (const product of snapshot.products.slice(0, 40)) {
  const blueprintId = String(product.blueprintId);
  const detail = await tryGetJson(`/v1/catalog/blueprints/${blueprintId}.json`);
  if (!detail || !String(detail?.title ?? "").trim()) continue;
  const providersPayload = await tryGetJson(`/v1/catalog/blueprints/${blueprintId}/print_providers.json`);
  if (!providersPayload) continue;
  const providers = Array.isArray(providersPayload) ? providersPayload : (providersPayload?.data ?? []);
  for (const provider of providers.slice(0, 12)) {
    const providerId = String(provider?.id ?? "");
    if (!/^\d+$/.test(providerId)) continue;
    const variantsPayload = await tryGetJson(`/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json?show-out-of-stock=1`);
    if (!variantsPayload) continue;
    const variants = Array.isArray(variantsPayload) ? variantsPayload : (variantsPayload?.variants ?? variantsPayload?.data ?? []);
    if (variants.length > 0) {
      passed = { blueprintId, providerId, variants: variants.length, title: String(detail.title).slice(0, 80) };
      break;
    }
  }
  if (passed) break;
}

if (!passed) throw new Error("No catalog product produced a valid provider + variants smoke-test.");
console.log(JSON.stringify({ ok: true, ...passed }));
