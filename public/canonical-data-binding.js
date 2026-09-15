/* Canonical DTF Studio data bridge. It never creates a second design or a Master relation. */
(() => {
  const CACHE_KEY = "dtf-studio-canonical-catalog-v1";
  const APPLIED_KEY = "dtf-studio-canonical-catalog-applied-v1";
  const legacyIds = new Set(["d1", "d2"]);

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }

  function stateKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const value = key && readJson(key);
      if (value && typeof value === "object" && (Array.isArray(value.designs) || Array.isArray(value.products))) keys.push(key);
    }
    return keys;
  }

  function canonicalDesign(row) {
    return {
      id: row.id,
      en: row.titleEn,
      ar: row.titleAr,
      enDesc: "",
      arDesc: "",
      products: [],
      master: null,
      cover: row.assetId,
      status: row.status,
      owner: row.designerId ? "designer" : "house",
      assets: [{ id: row.assetId, name: row.imageUrl.split("/").pop(), format: "PNG", mime: "image/png", preview: true, readable: true, protected: true, url: row.imageUrl }],
      validation: []
    };
  }

  function mergeCatalog(catalog) {
    let changed = false;
    const cachedDesigns = Array.isArray(catalog?.designs) ? catalog.designs : [];
    const cachedProducts = Array.isArray(catalog?.products) ? catalog.products : [];
    for (const key of stateKeys()) {
      const state = readJson(key);
      if (!state) continue;
      if (Array.isArray(state.designs) && cachedDesigns.length) {
        const canonicalById = new Map(cachedDesigns.map((row) => [row.id, row]));
        const designs = state.designs.filter((design) => !legacyIds.has(design.id));
        for (const row of cachedDesigns) {
          const next = canonicalDesign(row);
          const index = designs.findIndex((design) => design.id === row.id);
          if (index < 0) designs.push(next);
          else designs[index] = { ...designs[index], ...next, master: null, assets: next.assets };
        }
        if (JSON.stringify(designs) !== JSON.stringify(state.designs)) { state.designs = designs; changed = true; }
      }
      if (Array.isArray(state.products) && cachedProducts.length) {
        const byModel = new Map();
        for (const row of cachedProducts) {
          const current = byModel.get(row.modelId) || { ...row, variants: [] };
          current.variants.push(row);
          current.price = Math.min(...current.variants.map((variant) => Number(variant.retailPriceJod) / 100));
          current.enabled = current.variants.some((variant) => Number(variant.enabled ?? 1) === 1);
          byModel.set(row.modelId, current);
        }
        for (const product of state.products) {
          const live = byModel.get(product.modelId) || byModel.get(product.id);
          if (!live) continue;
          Object.assign(product, { modelId: live.modelId, categoryId: live.categoryId, en: live.nameEn, ar: live.nameAr, price: live.price, enabled: live.enabled, variants: live.variants });
          changed = true;
        }
      }
      if (changed) localStorage.setItem(key, JSON.stringify(state));
    }
    return changed;
  }

  function patchHomeDesignCards(catalog) {
    const rows = Array.isArray(catalog?.designs) ? catalog.designs.filter((row) => row.status === "published" && row.visibility !== "hidden") : [];
    if (!rows.length) return;
    const sections = [...document.querySelectorAll("section")].filter((section) => /designer designs|تصاميم المصممين/i.test(section.textContent || ""));
    for (const section of sections) {
      const images = [...section.querySelectorAll("img")].filter((image) => !image.closest("header,nav"));
      images.slice(0, rows.length).forEach((image, index) => {
        const row = rows[index];
        image.src = row.imageUrl;
        image.alt = row.titleEn;
        image.style.objectPosition = "center";
        const card = image.closest("article,li,a,[class*=card]") || image.parentElement;
        if (!card) return;
        card.dataset.canonicalDesignId = row.id;
        const title = card.querySelector("h3,h4,h5,[class*=title],[class*=name]");
        if (title && !/designer designs|تصاميم المصممين/i.test(title.textContent || "")) title.textContent = document.documentElement.dir === "rtl" ? row.titleAr : row.titleEn;
      });
    }
  }

  async function loadCatalog() {
    try {
      const [designsResponse, productsResponse] = await Promise.all([fetch("/api/studio/designs", { credentials: "same-origin" }), fetch("/api/studio/products", { credentials: "same-origin" })]);
      if (!designsResponse.ok || !productsResponse.ok) return null;
      const designsPayload = await designsResponse.json();
      const productsPayload = await productsResponse.json();
      const catalog = { designs: designsPayload.designs || [], products: productsPayload.products || [] };
      localStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
      return catalog;
    } catch { return null; }
  }

  const cached = readJson(CACHE_KEY);
  if (cached) { mergeCatalog(cached); patchHomeDesignCards(cached); }

  loadCatalog().then((catalog) => {
    if (catalog) patchHomeDesignCards(catalog);
    if (!catalog) return;
    const changed = mergeCatalog(catalog);
    if (changed && !sessionStorage.getItem(APPLIED_KEY)) {
      sessionStorage.setItem(APPLIED_KEY, "1");
      location.reload();
    }
  });
})();
