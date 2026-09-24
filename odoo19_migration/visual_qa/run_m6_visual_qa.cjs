const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://127.0.0.1";
const DB = process.env.ODOO_DB || "odoo_visual";
const ACTION_ID = process.env.DTF_ACTION_ID || "";
const ORDER1 = process.env.JOB_ORDER_1 || "";
const ORDER2 = process.env.JOB_ORDER_2 || "";
const MASTER = "m6-visual-master.png";
const OUT = path.join(process.cwd(), "odoo19_migration", "visual_qa", "output");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  source_head: process.env.M6_SOURCE_HEAD || "",
  checks: {},
  metrics: {},
  console_errors: [],
  page_errors: [],
  network_errors: [],
  ignored_network_errors: [],
  screenshots: [],
  notes: [],
};

function attachDiagnostics(page, actor) {
  page.on("console", msg => {
    if (msg.type() === "error") report.console_errors.push({ actor, text: msg.text() });
  });
  page.on("pageerror", err => report.page_errors.push({ actor, text: String(err) }));
  page.on("response", response => {
    const status = response.status();
    if (status >= 400 && !response.url().includes("/web/session/logout")) {
      const url = response.url();
      if (url.includes("/web/image/website/") && url.includes("/logo/")) {
        report.ignored_network_errors.push({ actor, status, url, reason: "generic website login/logo asset; outside M6 production UI" });
      } else {
        report.network_errors.push({ actor, status, url });
      }
    }
  });
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  report.screenshots.push(name);
}

async function login(page, username, password, key) {
  await page.goto(`${BASE}/web/login?db=${encodeURIComponent(DB)}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="login"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForTimeout(2500);
  const ok = !page.url().includes("/web/login") && !page.url().includes("error=access");
  report.checks[`${key}_login`] = ok;
  return ok;
}

async function openPrintJobs(page) {
  await page.goto(`${BASE}/odoo/action-dtf_production.action_dtf_print_jobs`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  if (await page.locator(".o_list_view").count()) return true;
  if (ACTION_ID) {
    await page.goto(`${BASE}/web#action=${ACTION_ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    if (await page.locator(".o_list_view").count()) return true;
  }
  return false;
}

async function openOrderRow(page, orderName) {
  const row = page.locator(".o_data_row").filter({ hasText: orderName }).first();
  if (!(await row.count())) return false;
  await row.click();
  await page.waitForTimeout(1600);
  return (await page.locator(".o_form_view").count()) > 0;
}

async function clickButton(page, name) {
  const button = page.getByRole("button", { name, exact: true }).first();
  if (!(await button.count())) return false;
  await button.click();
  await page.waitForTimeout(1300);
  return true;
}

async function metrics(page, key) {
  report.metrics[key] = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }));
}

async function checkMasterDownload(page) {
  report.checks.master_filename_visible = (await page.getByText(MASTER, { exact: false }).count()) > 0;
  const candidates = [
    page.getByRole("button", { name: "Download Print Master", exact: true }).first(),
    page.locator('a[href*="/web/content/"]').filter({ hasText: MASTER }).first(),
    page.locator(`.o_field_binary_file:has-text("${MASTER}") a[href*="/web/content/"]`).first(),
  ];
  for (const candidate of candidates) {
    if (await candidate.count()) {
      try {
        const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
        await candidate.click();
        const download = await downloadPromise;
        report.checks.master_download = true;
        report.checks.master_download_filename = download.suggestedFilename();
        await download.saveAs(path.join(OUT, "downloaded-" + download.suggestedFilename()));
        return;
      } catch (e) {
        report.notes.push("Master control visible but no download event: " + String(e));
      }
    }
  }
  report.checks.master_download = false;
}

async function adminInspection(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  attachDiagnostics(page, "admin");
  if (!(await login(page, process.env.ADMIN_LOGIN, process.env.ADMIN_PASSWORD, "admin"))) {
    await screenshot(page, "00-admin-login-failed.png");
    await context.close();
    return;
  }
  report.checks.admin_list_opened = await openPrintJobs(page);
  if (report.checks.admin_list_opened) {
    report.checks.admin_list_rows = await page.locator(".o_data_row").count();
    report.checks.admin_order_1_visible = (await page.getByText(ORDER1, { exact: false }).count()) > 0;
    report.checks.admin_order_2_visible = (await page.getByText(ORDER2, { exact: false }).count()) > 0;
    await metrics(page, "admin_desktop_list");
    await screenshot(page, "01-admin-printing-jobs-list-desktop.png");

    report.checks.admin_form_opened = await openOrderRow(page, ORDER1);
    if (report.checks.admin_form_opened) {
      report.checks.admin_protected_evidence_visible =
        (await page.getByText("Protected Evidence", { exact: true }).count()) > 0;
      report.checks.admin_master_section_visible =
        (await page.getByText("Ready-to-Print Master", { exact: true }).count()) > 0;
      report.checks.admin_customer_visible =
        (await page.getByText("M6 Visual Customer", { exact: false }).count()) > 0;
      await metrics(page, "admin_desktop_form");
      await screenshot(page, "02-admin-printing-job-form-desktop.png");
      await screenshot(page, "03-admin-ready-to-print-master.png");
      await checkMasterDownload(page);
    }
  }
  await context.close();
}

async function operatorInspection(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  attachDiagnostics(page, "operator");
  if (!(await login(page, process.env.OPERATOR_LOGIN, process.env.OPERATOR_PASSWORD, "operator"))) {
    await screenshot(page, "00-operator-login-failed.png");
    await context.close();
    return;
  }

  report.checks.operator_list_opened = await openPrintJobs(page);
  if (!report.checks.operator_list_opened) {
    await screenshot(page, "operator-list-failed.png");
    await context.close();
    return;
  }

  const rows = await page.locator(".o_data_row").count();
  report.checks.operator_list_rows = rows;
  report.checks.operator_only_dtf_jobs = rows === 2;
  report.checks.operator_order_1_visible = (await page.getByText(ORDER1, { exact: false }).count()) > 0;
  report.checks.operator_order_2_visible = (await page.getByText(ORDER2, { exact: false }).count()) > 0;
  await metrics(page, "operator_desktop_list");
  await screenshot(page, "04-operator-printing-jobs-list-desktop.png");

  report.checks.operator_form_opened = await openOrderRow(page, ORDER1);
  if (report.checks.operator_form_opened) {
    report.checks.operator_protected_evidence_hidden =
      (await page.getByText("Protected Evidence", { exact: true }).count()) === 0;
    report.checks.operator_customer_visible =
      (await page.getByText("M6 Visual Customer", { exact: false }).count()) > 0;
    report.checks.operator_master_visible =
      (await page.getByText(MASTER, { exact: false }).count()) > 0;
    await screenshot(page, "05-operator-new.png");

    report.checks.new_to_under_preparation = await clickButton(page, "Start Preparation");
    await screenshot(page, "06-operator-under-preparation.png");

    report.checks.under_preparation_to_ready = await clickButton(page, "Mark Ready");
    await screenshot(page, "07-operator-ready.png");

    report.checks.ready_to_completed = await clickButton(page, "Complete");
    report.checks.completed_cannot_restart =
      (await page.getByRole("button", { name: "Start Preparation", exact: true }).count()) === 0;
    await screenshot(page, "08-operator-completed.png");
  }

  await openPrintJobs(page);
  if (await openOrderRow(page, ORDER2)) {
    report.checks.new_to_cancelled = await clickButton(page, "Cancel");
    await screenshot(page, "09-operator-cancelled.png");
  } else {
    report.checks.new_to_cancelled = false;
  }

  report.checks.operator_settings_not_exposed =
    (await page.getByText("Settings", { exact: true }).count()) === 0;
  await context.close();
}

async function responsive(browser, width, height, key, prefix) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  attachDiagnostics(page, key);
  if (await login(page, process.env.OPERATOR_LOGIN, process.env.OPERATOR_PASSWORD, key)) {
    report.checks[`${key}_list_opened`] = await openPrintJobs(page);
    if (report.checks[`${key}_list_opened`]) {
      await metrics(page, `${key}_list`);
      await screenshot(page, `${prefix}-list.png`);
      report.checks[`${key}_form_opened`] = await openOrderRow(page, ORDER1);
      if (report.checks[`${key}_form_opened`]) {
        await metrics(page, `${key}_form`);
        await screenshot(page, `${prefix}-form.png`);
      }
    }
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await adminInspection(browser);
    await operatorInspection(browser);
    await responsive(browser, 1024, 768, "tablet", "10-tablet");
    await responsive(browser, 390, 844, "mobile", "11-mobile");

    const required = [
      "admin_login", "admin_list_opened", "admin_form_opened",
      "admin_protected_evidence_visible", "admin_master_section_visible",
      "master_filename_visible", "master_download",
      "operator_login", "operator_list_opened", "operator_form_opened",
      "operator_protected_evidence_hidden", "operator_only_dtf_jobs",
      "operator_settings_not_exposed",
      "new_to_under_preparation", "under_preparation_to_ready",
      "ready_to_completed", "completed_cannot_restart", "new_to_cancelled",
      "tablet_list_opened", "tablet_form_opened",
      "mobile_list_opened", "mobile_form_opened"
    ];

    const noOverflow = Object.values(report.metrics).every(m => !m.hasHorizontalOverflow);
    const hardNetworkErrors = report.network_errors.filter(e => e.status >= 500);
    const actionableConsoleErrors = report.console_errors.filter(e => {
      if (/Failed to load resource:.*500/.test(e.text) && hardNetworkErrors.length === 0) return false;
      return true;
    });
    report.actionable_console_errors = actionableConsoleErrors;

    report.visual_pass =
      required.every(key => report.checks[key] === true) &&
      noOverflow &&
      actionableConsoleErrors.length === 0 &&
      report.page_errors.length === 0 &&
      hardNetworkErrors.length === 0;
  } catch (e) {
    report.fatal_error = String(e && e.stack ? e.stack : e);
    report.visual_pass = false;
  } finally {
    fs.writeFileSync(path.join(OUT, "visual-report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(OUT, "README.txt"),
      [
        "M6 Visual QA",
        "Source M6 HEAD: " + report.source_head,
        "Visual pass: " + report.visual_pass,
        "See visual-report.json and PNG screenshots."
      ].join("\n")
    );
    await browser.close();
  }

  if (!report.visual_pass) process.exitCode = 2;
})();
