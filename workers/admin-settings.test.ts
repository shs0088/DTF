import { describe, expect, test } from "bun:test";

describe("Admin Settings implementation contracts", () => {
  test("business settings use the existing business_settings table and preserve reservation_minutes compatibility", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("businessSettingsSnapshot()");
    expect(source).toContain('map.get("storefront_config")');
    expect(source).toContain('map.has("reservation_minutes")');
    expect(source).toContain("adminUpdateBusinessSettings");
    expect(source).toContain("INSERT INTO business_settings (key,value_json,updated_at) VALUES ('reservation_minutes'");
  });

  test("critical business settings are range validated", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain('5,120,"Stock reservation timeout"');
    expect(source).toContain('1,72,"POD confirmation period"');
    expect(source).toContain('0,240,"Customer cancellation window"');
    expect(source).toContain('72,1200,"Minimum DPI"');
    expect(source).toContain('1048576,209715200,"Maximum artwork file size"');
    expect(source).toContain("Percentage");
  });

  test("designer qualification sample count is fixed at exactly three and not persisted as an editable setting", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("requiredDesignerSamples:3");
    const update=source.slice(source.indexOf("adminUpdateBusinessSettings"),source.indexOf("adminPromotionsList"));
    expect(update).not.toContain("requiredDesignerSamples:");
    const ui=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(ui).toContain('Required qualification designs<input value="3" disabled');
  });

  test("public settings endpoint is read-only and does not touch server secrets", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname!=="/api/settings"');
    expect(source).toContain('request.method!=="GET"');
    const start=source.indexOf("async function publicBusinessSettingsApi");
    const end=source.indexOf("async function adminPromotionsApi",start);
    const fn=source.slice(start,end);
    expect(fn).toContain("businessSettingsSnapshot");
    expect(fn).not.toContain("server_secrets");
    expect(fn).not.toContain("secret_value");
  });

  test("Admin Settings requires Access for reads and Modify for writes", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname!=="/api/admin/settings"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.settings",permission)');
    expect(source).toContain('url.pathname === "/admin/settings") return new Response(localizeAdminHtml(ADMIN_SETTINGS_PAGE,request)');
  });

  test("Settings UI exposes payment, timers, delivery, designer economics, artwork rules and bilingual policies", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Currency & Payment","Timing / Stock Reservation","Delivery / Pickup","Designer Economics / Qualification","Artwork Validation Defaults","Terms & Conditions EN","Privacy Policy AR","No Return Policy AR"]) expect(source).toContain(text);
  });
});
