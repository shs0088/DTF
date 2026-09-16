import { describe, expect, test } from "bun:test";

describe("Admin Integrations implementation contracts", () => {
  test("integration status uses real local Printify operational state", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminIntegrationsStatus()");
    for(const text of ["printify_catalog_items","product_models WHERE source='printify'","printify_product_data WHERE published=1","printify_variant_settings WHERE enabled=1","supplier_orders WHERE lower(provider)='printify'","printify_last_sync"]) expect(source).toContain(text);
  });

  test("integration status never returns server secret names or values", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    const start=source.indexOf("adminIntegrationsStatus()");
    const end=source.indexOf("businessSettingsSnapshot()",start);
    const method=source.slice(start,end);
    expect(method).toContain("inventoryDisclosed:false");
    expect(method).toContain("valuesExposed:false");
    expect(method).toContain("namesExposed:false");
    expect(method).toContain("internalSessionSecretHidden:true");
    expect(method).not.toContain("secret_value");
    expect(method).not.toContain("SELECT key_name AS");
    expect(method).not.toContain("ADMIN_WEB_KEY");
  });

  test("runtime status reports connector and snapshot presence without exposing credentials", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const start=source.indexOf("async function adminIntegrationsApi");
    const end=source.indexOf("async function adminSettingsApi",start);
    const api=source.slice(start,end);
    expect(api).toContain("printifyConnectorConfigured:Boolean(env.CONNECTIONS)");
    expect(api).toContain("snapshotAssetsConfigured:Boolean(env.ASSETS)");
    expect(api).toContain("credentialsExposed:false");
    expect(api).not.toContain("secret_value");
    expect(api).not.toContain("ADMIN_WEB_KEY");
  });

  test("safe diagnostic checks connector registration and snapshot only, not a live supplier request", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const start=source.indexOf("async function adminIntegrationsApi");
    const end=source.indexOf("async function adminSettingsApi",start);
    const api=source.slice(start,end);
    expect(api).toContain('(env.CONNECTIONS as any).find("printify")');
    expect(api).toContain("loadPrintifySnapshot(request,env)");
    expect(api).not.toContain("printifyRequest(env");
  });

  test("Integrations API enforces Access for status and Modify for diagnostic actions", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/integrations")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.integrations",permission)');
    expect(source).toContain('url.pathname === "/admin/integrations") return new Response(ADMIN_INTEGRATIONS_PAGE');
  });

  test("Integrations UI is status-oriented and explicitly hides credentials", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Integrations","Server connector","Catalog snapshot assets","Run safe diagnostic","Server-managed Secret Safety","secret values are intentionally hidden"]) expect(source).toContain(text);
  });
});
