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

async function dismissNativeChatWindows(page, actor) {
  let dismissed = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    const closeButton = page.locator(
      ".o-mail-ChatWindow .o-mail-ActionList-button[name='close']:visible"
    ).first();
    if (await closeButton.count()) {
      await closeButton.click();
      dismissed++;
      await page.waitForTimeout(300);
      continue;
    }
    await page.waitForTimeout(250);
  }
  if (dismissed) {
    report.metrics.native_chat_windows_dismissed ??= {};
    report.metrics.native_chat_windows_dismissed[actor] =
      (report.metrics.native_chat_windows_dismissed[actor] || 0) + dismissed;
  }
}

async function openAction(page, xmlid, actor = "unknown") {
  await page.goto(`${BASE}/odoo/action-${xmlid}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await dismissNativeChatWindows(page, actor);

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

  const rendered = page.locator(
    ".o_dtf_admin_dashboard, .o_graph_renderer, .o_pivot_renderer, .o_list_renderer, .o_form_view, .o_kanban_renderer"
  ).first();
  try {
    await rendered.waitFor({ state: "visible", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
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

  report.checks.english_dashboard = await openAction(page, "dtf_admin.action_dtf_admin_dashboard_client", "dashboard");
  try {
    await page.locator(".o_dtf_admin_dashboard .dtf-dashboard-ready").waitFor({
      state: "visible",
      timeout: 10000,
    });
    report.checks.english_dashboard_ready = true;
  } catch {
    report.checks.english_dashboard_ready = false;
  }
  await dismissNativeChatWindows(page, "english");
  report.checks.english_dashboard_kpis =
    (await page.locator(".o_dtf_admin_dashboard .dtf-kpi-card").count()) >= 7;
  report.metrics.english_direction = await direction(page);
  report.metrics.english_theme = await theme(page);
  report.metrics.english_dashboard = await overflow(page);
  report.checks.english_ltr =
    !report.metrics.english_direction.nativeRtl &&
    !report.metrics.english_direction.rtlStylesheet;
  report.checks.theme_accent =
    report.metrics.english_theme.accent.toLowerCase() === "#00a8ff";
  await shot(page, "01-english-dashboard.png");

  report.checks.english_designers = await openAction(page, "dtf_admin.action_dtf_admin_designers", "designers");
  report.checks.english_designers_title =
    (await page.getByText("Designers", { exact: true }).count()) > 0;
  await shot(page, "02-english-designers.png");

  report.checks.english_design_review = await openAction(page, "dtf_admin.action_dtf_admin_design_review", "design_review");
  await dismissNativeChatWindows(page, "english");
  const row = page.locator(".o_data_row").first();
  if (await row.count()) {
    await row.scrollIntoViewIfNeeded();
    await dismissNativeChatWindows(page, "english");
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

  report.checks.arabic_dashboard = await openAction(page, "dtf_admin.action_dtf_admin_dashboard_client", "dashboard");
  try {
    await page.locator(".o_dtf_admin_dashboard .dtf-dashboard-ready").waitFor({
      state: "visible",
      timeout: 10000,
    });
    report.checks.arabic_dashboard_ready = true;
  } catch {
    report.checks.arabic_dashboard_ready = false;
  }
  await dismissNativeChatWindows(page, "arabic");
  report.checks.arabic_dashboard_kpis =
    (await page.locator(".o_dtf_admin_dashboard .dtf-kpi-card").count()) >= 7;
  report.checks.arabic_dashboard_title =
    (await page.getByText("لوحة التحكم", { exact: true }).count()) > 0;
  report.metrics.arabic_direction = await direction(page);
  report.metrics.arabic_dashboard = await overflow(page);
  report.checks.arabic_rtl =
    report.metrics.arabic_direction.nativeRtl ||
    report.metrics.arabic_direction.rtlStylesheet;
  await shot(page, "04-arabic-dashboard.png");

  report.checks.arabic_designers = await openAction(page, "dtf_admin.action_dtf_admin_designers", "designers");
  report.checks.arabic_translated_designers =
    (await page.getByText("المصممون", { exact: true }).count()) > 0 ||
    (await page.getByText("جميع المصممين", { exact: true }).count()) > 0;
  await shot(page, "05-arabic-designers.png");

  report.checks.arabic_design_review = await openAction(page, "dtf_admin.action_dtf_admin_design_review", "design_review");
  await dismissNativeChatWindows(page, "arabic");
  const row = page.locator(".o_data_row").first();
  if (await row.count()) {
    await row.scrollIntoViewIfNeeded();
    await dismissNativeChatWindows(page, "arabic");
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

async function inspectResponsive(browser, {
  key,
  viewport,
  loginName,
  password,
  expectRtl,
  dashboardShot,
  formShot,
}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  diagnostics(page, key);

  if (!(await login(page, loginName, password, key))) {
    await shot(page, `00-${key}-login-failed.png`);
    await context.close();
    return;
  }

  report.checks[`${key}_dashboard`] = await openAction(
    page,
    "dtf_admin.action_dtf_admin_dashboard_client",
    key
  );
  try {
    await page.locator(".o_dtf_admin_dashboard .dtf-dashboard-ready").waitFor({
      state: "visible",
      timeout: 10000,
    });
    report.checks[`${key}_dashboard_ready`] = true;
  } catch {
    report.checks[`${key}_dashboard_ready`] = false;
  }
  await dismissNativeChatWindows(page, key);
  report.checks[`${key}_dashboard_kpis`] =
    (await page.locator(".o_dtf_admin_dashboard .dtf-kpi-card").count()) >= 7;
  report.metrics[`${key}_direction`] = await direction(page);
  report.metrics[`${key}_dashboard`] = await overflow(page);
  report.checks[`${key}_direction_ok`] = expectRtl
    ? (
        report.metrics[`${key}_direction`].nativeRtl ||
        report.metrics[`${key}_direction`].rtlStylesheet
      )
    : (
        !report.metrics[`${key}_direction`].nativeRtl &&
        !report.metrics[`${key}_direction`].rtlStylesheet
      );
  await shot(page, dashboardShot);

  report.checks[`${key}_design_review`] = await openAction(
    page,
    "dtf_admin.action_dtf_admin_design_review",
    key
  );
  await dismissNativeChatWindows(page, "english");
  const row = page.locator(".o_data_row").first();
  if (await row.count()) {
    await row.scrollIntoViewIfNeeded();
    await dismissNativeChatWindows(page, "english");
    await row.click();
    await page.waitForTimeout(1200);
    report.checks[`${key}_design_form`] =
      (await page.locator(".o_form_view").count()) > 0;
    report.metrics[`${key}_design_form`] = await overflow(page);
    await shot(page, formShot);
  } else {
    report.checks[`${key}_design_form`] = false;
  }

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await inspectEnglish(browser);
    await inspectArabic(browser);
    await inspectResponsive(browser, {
      key: "tablet_en",
      viewport: { width: 1024, height: 768 },
      loginName: process.env.ADMIN_LOGIN,
      password: process.env.ADMIN_PASSWORD,
      expectRtl: false,
      dashboardShot: "07-tablet-english-dashboard.png",
      formShot: "08-tablet-english-design-form.png",
    });
    await inspectResponsive(browser, {
      key: "mobile_en",
      viewport: { width: 390, height: 844 },
      loginName: process.env.ADMIN_LOGIN,
      password: process.env.ADMIN_PASSWORD,
      expectRtl: false,
      dashboardShot: "09-mobile-english-dashboard.png",
      formShot: "10-mobile-english-design-form.png",
    });
    await inspectResponsive(browser, {
      key: "mobile_ar",
      viewport: { width: 390, height: 844 },
      loginName: process.env.ARABIC_LOGIN,
      password: process.env.ARABIC_PASSWORD,
      expectRtl: true,
      dashboardShot: "11-mobile-arabic-dashboard.png",
      formShot: "12-mobile-arabic-design-form.png",
    });

    const required = [
      "english_login",
      "english_dashboard",
      "english_dashboard_ready",
      "english_dashboard_kpis",
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
      "arabic_dashboard_ready",
      "arabic_dashboard_kpis",
      "arabic_dashboard_title",
      "arabic_rtl",
      "arabic_designers",
      "arabic_translated_designers",
      "arabic_design_review",
      "arabic_design_form",
      "english_content_ltr_in_arabic_admin",
      "arabic_content_rtl",
      "tablet_en_login",
      "tablet_en_dashboard",
      "tablet_en_dashboard_ready",
      "tablet_en_dashboard_kpis",
      "tablet_en_direction_ok",
      "tablet_en_design_review",
      "tablet_en_design_form",
      "mobile_en_login",
      "mobile_en_dashboard",
      "mobile_en_dashboard_ready",
      "mobile_en_dashboard_kpis",
      "mobile_en_direction_ok",
      "mobile_en_design_review",
      "mobile_en_design_form",
      "mobile_ar_login",
      "mobile_ar_dashboard",
      "mobile_ar_dashboard_ready",
      "mobile_ar_dashboard_kpis",
      "mobile_ar_direction_ok",
      "mobile_ar_design_review",
      "mobile_ar_design_form",
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
        "English/Arabic desktop plus tablet/mobile screenshots are included in this artifact.",
      ].join("\n")
    );
    await browser.close();
  }

  if (!report.visual_pass) process.exitCode = 2;
})();
