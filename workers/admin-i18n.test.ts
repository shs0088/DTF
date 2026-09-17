import { describe, expect, test } from "bun:test";
import { adminLocaleFromRequest, adminLocaleCookie, localizeAdminHtml } from "./admin-i18n";

const page = '<!doctype html><html><head><title>Dashboard</title></head><body><nav><a href="/admin/dashboard">Dashboard</a></nav><button>Save</button></body></html>';

 describe("Admin i18n", () => {
  test("resolves English by default and explicit lang=en", () => {
    expect(adminLocaleFromRequest(new Request("https://dtf.test/admin"))).toBe("en");
    expect(adminLocaleFromRequest(new Request("https://dtf.test/admin?lang=en"))).toBe("en");
  });

  test("resolves Arabic from query and dtf_locale cookie", () => {
    expect(adminLocaleFromRequest(new Request("https://dtf.test/admin?lang=ar"))).toBe("ar");
    expect(adminLocaleFromRequest(new Request("https://dtf.test/admin", { headers: { cookie: "dtf_locale=ar" } }))).toBe("ar");
  });

  test("emits correct document direction and language", () => {
    const ar = localizeAdminHtml(page, new Request("https://dtf.test/admin?lang=ar"));
    expect(ar).toContain('<html lang="ar" dir="rtl">');
    expect(ar).toContain("لوحة التحكم");
    const en = localizeAdminHtml(page, new Request("https://dtf.test/admin?lang=en"));
    expect(en).toContain('<html lang="en" dir="ltr">');
    expect(en).toContain("Dashboard");
  });

  test("language switch stays on the current Admin path and only changes locale", () => {
    const ar = localizeAdminHtml(page, new Request("https://dtf.test/admin/production?lang=ar"));
    expect(ar).toContain("location.pathname+'?lang='+(locale==='ar'?'en':'ar')");
    expect(ar).not.toContain("/api/");
  });

  test("locale cookie uses the existing dtf_locale state without backend values", () => {
    expect(adminLocaleCookie("ar")).toContain("dtf_locale=ar");
    expect(adminLocaleCookie("en")).toContain("dtf_locale=en");
    expect(localizeAdminHtml(page, new Request("https://dtf.test/admin?lang=ar"))).toContain("Dashboard");
    expect(localizeAdminHtml(page, new Request("https://dtf.test/admin?lang=ar"))).toContain("Save");
  });

  test("localization layer contains no permission or persistence operations", () => {
    const source = Bun.file(new URL("./admin-i18n.ts", import.meta.url));
    return source.text().then((text) => {
      expect(text).not.toContain("adminPermission");
      expect(text).not.toContain("query(");
      expect(text).not.toContain("storage");
    });
  });
});
