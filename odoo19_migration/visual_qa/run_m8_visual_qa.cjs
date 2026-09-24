const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://127.0.0.1";
const DB = process.env.ODOO_DB || "odoo_m8_visual";
const OUT = path.join(process.cwd(), "odoo19_migration", "visual_qa", "m8-output");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  source_head: process.env.M8_SOURCE_HEAD || "",
  checks: {},
  metrics: {},
  console_errors: [],
  page_errors: [],
  network_errors: [],
  ignored_network_errors: [],
  screenshots: [],
};

function diagnostics(page, actor) {
  page.on("console", msg => {
    if (msg.type() === "error") report.console_errors.push({ actor, text: msg.text() });
  });
  page.on("pageerror", err => report.page_errors.push({ actor, text: String(err) }));
  page.on("response", response => {
    if (response.status() >= 500) {
      const item = { actor, status: response.status(), url: response.url() };
      if (response.url().includes("/web/image/website/") && response.url().includes("/logo/")) {
        report.ignored_network_errors.push({ ...item, reason: "generic website logo asset; outside M8 Admin UI" });
      } else {
        report.network_errors.push(item);
      }
    }
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  report.screenshots.push(name);
}

async function login(page, loginName, password, key) {
  await page.goto(`${BASE}/web/login?db=${encodeURIComponent(DB)}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="login"]').fill(loginName);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForTimeout(2200);
  report.checks[`${key}_login`] = !page.url().includes("/web/login");
  return report.checks[`${key}_login`];
}

async function openAction(page, xmlid) {
  await page.goto(`${BASE}/odoo/action-${xmlid}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);

  const visibleModal = page.locator(".modal.show:visible").first();
  if (await visibleModal.count()) {
    const modalText = (await visibleModal.innerText()).toLowerCase();
    if (
      modalText.includes("access error") ||
      modalText.includes("خطأ في الوصول")
    ) {
      return false;
    }
  }

  return (await page.locator(
    ".o_graph_renderer, .o_pivot_renderer, .o_list_renderer, .o_form_view, .o_kanban_renderer"
  ).count()) > 0;
}

async function direction(page) {
  return await page.evaluate(() => ({
    htmlDir: document.documentElement.getAttribute("dir") || "",
    bodyDirection: getComputedStyle(document.body).direction,
    webClientDirection: document.querySelector(".o_web_client")
      ? getComputedStyle(document.querySelector(".o_web_client")).direction
      : "",
    bodyClass: document.body.className,
    nativeRtl: document.body.classList.contains("o_rtl"),
    rtlStylesheet: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .some(link => /\.rtl(?:\.min)?\.css(?:\?|$)/.test(link.href)),
  }));
}

async function theme(page) {
  return await page.evaluate(() => {
    const el = document.querySelector(".o_web_client");
    if (!el) return { accent: "", background: "" };
    const style = getComputedStyle(el);
    return {
      accent: style.getPropertyValue("--dtf-admin-accent").trim(),
      background: style.backgroundColor,
    };
  });
}

async function overflow(page) {
  return await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }));
}

async function inspectEnglish(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  diagnostics(page, "english");

  if (!(await login(page, process.env.ADMIN_LOGIN, process.env.ADMIN_PASSWORD, "english"))) {
    await shot(page, "00-english-login-failed.png");
    await context.close();
    return;
  }

  report.checks.english_dashboard = await openAction(page, "dtf_admin.action_dtf_admin_dashboard");
  report.metrics.english_direction = await direction(page);
  report.metrics.english_theme = await theme(page);
  report.metrics.english_dashboard = await overflow(page);
  report.checks.english_ltr =
    !report.metrics.english_direction.nativeRtl &&
    !report.metrics.english_direction.rtlStylesheet;
  report.checks.theme_accent =
    report.metrics.english_theme.accent.toLowerCase() === "#00a8ff";
  await shot(page, "01-english-dashboard.png");

  report.checks.english_designers = await openAction(page, "dtf_admin.action_dtf_admin_designers");
  report.checks.english_designers_title =
    (await page.getByText("Designers", { exact: true }).count()) > 0;
  await shot(page, "02-english-designers.png");

  report.checks.english_design_review = await openAction(page, "dtf_admin.action_dtf_admin_design_review");
  const row = page.locator(".o_data_row").first();
  if (await row.count()) {
    await row.click();
    await page.waitForTimeout(1200);
    report.checks.english_design_form = (await page.locator(".o_form_view").count()) > 0;
    report.checks.english_content_ltr =
      (await page.locator('div[dir="ltr"]').count()) > 0;
    report.checks.arabic_content_rtl_in_english_admin =
      (await page.locator('div[dir="rtl"]').count()) > 0;
    await shot(page, "03-english-design-review-form.png");
  } else {
    report.checks.english_design_form = false;
  }

  await context.close();
}

async function inspectArabic(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  diagnostics(page, "arabic");

  if (!(await login(page, process.env.ARABIC_LOGIN, process.env.ARABIC_PASSWORD, "arabic"))) {
    await shot(page, "00-arabic-login-failed.png");
    await context.close();
    return;
  }

  report.checks.arabic_dashboard = await openAction(page, "dtf_admin.action_dtf_admin_dashboard");
  report.metrics.arabic_direction = await direction(page);
  report.metrics.arabic_dashboard = await overflow(page);
  report.checks.arabic_rtl =
    report.metrics.arabic_direction.nativeRtl ||
    report.metrics.arabic_direction.rtlStylesheet;
  await shot(page, "04-arabic-dashboard.png");

  report.checks.arabic_designers = await openAction(page, "dtf_admin.action_dtf_admin_designers");
  report.checks.arabic_translated_designers =
    (await page.getByText("المصممون", { exact: true }).count()) > 0 ||
    (await page.getByText("جميع المصممين", { exact: true }).count()) > 0;
  await shot(page, "05-arabic-designers.png");

  report.checks.arabic_design_review = await openAction(page, "dtf_admin.action_dtf_admin_design_review");
  const row = page.locator(".o_data_row").first();
  if (await row.count()) {
    await row.click();
    await page.waitForTimeout(1200);
    report.checks.arabic_design_form = (await page.locator(".o_form_view").count()) > 0;
    report.checks.english_content_ltr_in_arabic_admin =
      (await page.locator('div[dir="ltr"]').count()) > 0;
    report.checks.arabic_content_rtl =
      (await page.locator('div[dir="rtl"]').count()) > 0;
    await shot(page, "06-arabic-design-review-form.png");
  } else {
    report.checks.arabic_design_form = false;
  }

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await inspectEnglish(browser);
    await inspectArabic(browser);

    const required = [
      "english_login",
      "english_dashboard",
      "english_ltr",
      "theme_accent",
      "english_designers",
      "english_designers_title",
      "english_design_review",
      "english_design_form",
      "english_content_ltr",
      "arabic_content_rtl_in_english_admin",
      "arabic_login",
      "arabic_dashboard",
      "arabic_rtl",
      "arabic_designers",
      "arabic_translated_designers",
      "arabic_design_review",
      "arabic_design_form",
      "english_content_ltr_in_arabic_admin",
      "arabic_content_rtl",
    ];

    const noOverflow = Object.values(report.metrics)
      .filter(value => value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "overflow"))
      .every(value => value.overflow === false);

    report.visual_pass =
      required.every(key => report.checks[key] === true) &&
      noOverflow &&
      report.page_errors.length === 0 &&
      report.network_errors.length === 0;
  } catch (e) {
    report.fatal_error = String(e && e.stack ? e.stack : e);
    report.visual_pass = false;
  } finally {
    fs.writeFileSync(path.join(OUT, "visual-report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(OUT, "README.txt"),
      [
        "M8 Native Odoo Admin Visual QA",
        "Source HEAD: " + report.source_head,
        "Visual pass: " + report.visual_pass,
        "English and Arabic screenshots are included in this artifact.",
      ].join("\n")
    );
    await browser.close();
  }

  if (!report.visual_pass) process.exitCode = 2;
})();
