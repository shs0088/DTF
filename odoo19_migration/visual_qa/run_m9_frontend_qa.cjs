const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://127.0.0.1:5173";
const OUT = path.join(process.cwd(), "odoo19_migration", "visual_qa", "m9-output");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  source_head: process.env.M9_SOURCE_HEAD || "",
  checks: {},
  metrics: {},
  console_errors: [],
  page_errors: [],
  network_errors: [],
  screenshots: [],
};

function diagnostics(page, actor) {
  page.on("console", msg => {
    if (msg.type() === "error") {
      report.console_errors.push({ actor, text: msg.text() });
    }
  });
  page.on("pageerror", err => {
    report.page_errors.push({ actor, text: String(err) });
  });
  page.on("response", response => {
    if (response.status() >= 500) {
      report.network_errors.push({
        actor,
        status: response.status(),
        url: response.url(),
      });
    }
  });
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: true,
  });
  report.screenshots.push(name);
}

async function overflow(page) {
  return await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }));
}

async function requestJson(context, route) {
  const response = await context.request.get(BASE + route);
  return {
    status: response.status(),
    payload: await response.json(),
  };
}

async function login(page, identifier, password, returnTo) {
  await page.goto(
    BASE + "/login?returnTo=" + encodeURIComponent(returnTo),
    { waitUntil: "domcontentloaded" }
  );
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function inspectCustomerFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  diagnostics(page, "customer");

  const products = await requestJson(context, "/api/studio/products");
  report.checks.products_api =
    products.status === 200 &&
    products.payload &&
    products.payload.source === "odoo19" &&
    Array.isArray(products.payload.products) &&
    products.payload.products.some(item => item.nameEn === "M9 Visual Tee");

  const categories = await requestJson(context, "/api/studio/categories");
  report.checks.categories_api =
    categories.status === 200 &&
    categories.payload &&
    categories.payload.source === "odoo19" &&
    Array.isArray(categories.payload.categories) &&
    categories.payload.categories.some(item => item.nameEn === "M9 Visual Apparel");

  const designs = await requestJson(context, "/api/studio/designs");
  report.checks.designs_api =
    designs.status === 200 &&
    designs.payload &&
    designs.payload.source === "odoo19" &&
    Array.isArray(designs.payload.designs) &&
    designs.payload.designs.some(item => item.titleEn === "M9 Visual Gallery");

  await page.goto(BASE + "/?lang=en", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const homeRoot = page.locator('[data-home-source="odoo19"]');
  const homeHero = page.locator('[data-home-visible="hero"]');
  const homeCategories = page.locator('[data-home-visible="categories"]');
  const homeProducts = page.locator('[data-home-visible="products"]');
  report.checks.odoo_native_home =
    (await homeRoot.count()) === 1 &&
    (await homeHero.isVisible()) &&
    (await homeCategories.isVisible()) &&
    (await homeProducts.isVisible()) &&
    (await homeRoot.evaluate((node) => (node.textContent || "").trim().length)) > 80;
  report.metrics.home = await overflow(page);
  await shot(page, "01-odoo-native-home.png");

  await page.goto(BASE + "/designs?lang=en", { waitUntil: "domcontentloaded" });
  await page.getByText("M9 Visual Gallery", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.gallery_english = true;
  report.metrics.gallery_english = await overflow(page);
  await shot(page, "02-gallery-english.png");

  await page.goto(BASE + "/designs?lang=ar", { waitUntil: "domcontentloaded" });
  await page.getByText("معرض M9 المرئي", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.gallery_arabic =
    (await page.locator('main[dir="rtl"]').count()) > 0;
  report.metrics.gallery_arabic = await overflow(page);
  await shot(page, "03-gallery-arabic.png");

  await page.goto(BASE + "/customize?lang=en", { waitUntil: "domcontentloaded" });
  await page.getByText("Build your print.", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  const addButton = page.getByRole("button", {
    name: "Add to cart",
    exact: true,
  });
  report.checks.customizer_product =
    (await addButton.count()) === 1 &&
    !(await addButton.isDisabled());
  await addButton.click();
  await page.waitForURL(url => url.pathname === "/cart", { timeout: 15000 });
  await page.getByText("M9 Visual Tee", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.guest_cart = true;
  report.metrics.cart = await overflow(page);
  await shot(page, "04-guest-cart.png");

  await page.getByRole("link", { name: "Checkout", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/login", { timeout: 15000 });
  report.checks.checkout_requires_login = true;

  await page.locator("#identifier").fill("m9-visual-customer@example.test");
  await page.locator("#password").fill(process.env.CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/checkout", { timeout: 15000 });
  await page.getByText("Confirm your order.", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.checkout_after_login =
    (await page.getByText("M9 Visual Tee", { exact: false }).count()) > 0;
  report.metrics.checkout = await overflow(page);
  await shot(page, "05-checkout.png");

  await page.locator('input[name="customerPhone"]').fill("+962790000099");
  await page.locator('input[name="city"]').fill("Amman");
  await page.locator('input[name="address"]').fill("M9 Visual QA Address");
  await page.getByRole("button", { name: "Place order", exact: true }).click();
  await page.waitForURL(url => /^\/order\/\d+$/.test(url.pathname), {
    timeout: 20000,
  });
  report.checks.order_created = /^\/order\/\d+$/.test(new URL(page.url()).pathname);
  report.metrics.order = await overflow(page);
  await shot(page, "06-order-confirmation.png");

  await context.close();
}

async function inspectDesignerFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  diagnostics(page, "designer");

  await login(
    page,
    "m9-visual-designer@example.test",
    process.env.DESIGNER_PASSWORD,
    "/designer"
  );
  await page.waitForURL(url => url.pathname === "/designer", { timeout: 15000 });
  await page.getByText("Designer Dashboard", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.designer_dashboard =
    (await page.getByText("M9 Visual Gallery", { exact: true }).count()) > 0;
  report.metrics.designer_dashboard = await overflow(page);
  await shot(page, "07-designer-dashboard.png");

  await page.getByRole("link", { name: "New Design", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/designer/new-design", {
    timeout: 15000,
  });
  report.checks.designer_new_design =
    (await page.locator('input[name="titleEn"]').count()) === 1 &&
    (await page.locator('input[name="titleAr"]').count()) === 1 &&
    (await page.locator('textarea[name="descriptionEn"]').count()) === 1 &&
    (await page.locator('textarea[name="descriptionAr"]').count()) === 1 &&
    (await page.locator('input[type="radio"][name="productType"]').count()) === 7 &&
    (await page.locator('input[type="file"][name="files"]').count()) === 1;
  report.metrics.designer_new_design = await overflow(page);
  await shot(page, "08-designer-new-design.png");

  await context.close();
}

async function inspectMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  diagnostics(page, "mobile_arabic");

  await page.goto(BASE + "/designs?lang=ar", { waitUntil: "domcontentloaded" });
  await page.getByText("معرض M9 المرئي", { exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  report.checks.mobile_arabic_gallery =
    (await page.locator('main[dir="rtl"]').count()) > 0;
  report.metrics.mobile_arabic_gallery = await overflow(page);
  await shot(page, "09-mobile-arabic-gallery.png");

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await inspectCustomerFlow(browser);
    await inspectDesignerFlow(browser);
    await inspectMobile(browser);

    const required = [
      "products_api",
      "categories_api",
      "designs_api",
      "odoo_native_home",
      "gallery_english",
      "gallery_arabic",
      "customizer_product",
      "guest_cart",
      "checkout_requires_login",
      "checkout_after_login",
      "order_created",
      "designer_dashboard",
      "designer_new_design",
      "mobile_arabic_gallery",
    ];

    const noOverflow = Object.values(report.metrics)
      .filter(value =>
        value &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "overflow")
      )
      .every(value => value.overflow === false);

    report.visual_pass =
      required.every(key => report.checks[key] === true) &&
      noOverflow &&
      report.page_errors.length === 0 &&
      report.network_errors.length === 0;
  } catch (error) {
    report.fatal_error = String(error && error.stack ? error.stack : error);
    report.visual_pass = false;
  } finally {
    fs.writeFileSync(
      path.join(OUT, "visual-report.json"),
      JSON.stringify(report, null, 2)
    );
    fs.writeFileSync(
      path.join(OUT, "README.txt"),
      [
        "M9 Odoo-Native Frontend / Odoo Cutover Visual QA",
        "Source HEAD: " + report.source_head,
        "Visual pass: " + report.visual_pass,
        "Evidence covers Odoo-native dynamic Home, English/Arabic Gallery, guest cart,",
        "customer login/checkout/order, Designer Dashboard/New Design, and mobile RTL.",
      ].join("\n")
    );
    await browser.close();
  }

  if (!report.visual_pass) {
    process.exitCode = 2;
  }
})();
