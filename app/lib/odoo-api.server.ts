export type OdooRequestContext = {
  cloudflare: {
    env: unknown;
  };
};

type OdooCategory = {
  id: number;
  name?: string;
  name_ar?: string;
  sequence?: number;
};

type OdooVariantAttribute = {
  attribute?: string;
  value?: string;
};

type OdooVariant = {
  id: number;
  name?: string;
  sku?: string;
  price?: number;
  price_extra?: number;
  active?: boolean;
  stock_available?: number;
  attributes?: OdooVariantAttribute[];
};

type OdooProduct = {
  id: number;
  name?: string;
  name_ar?: string;
  price?: number;
  currency?: string;
  category_ids?: number[];
  catalog_type?: string;
  variants?: OdooVariant[];
};

export type LegacyStudioCategory = {
  id: string;
  nameAr: string;
  nameEn: string;
  enabled: number;
  homeFeatured: number;
  homeOrder: number;
};

export type LegacyStudioProduct = {
  modelId: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  variantId: string;
  sku: string;
  color: string | null;
  size: string | null;
  retailPriceJod: number;
  source: string;
};

function envRecord(context: OdooRequestContext): Record<string, unknown> {
  return (context.cloudflare?.env ?? {}) as Record<string, unknown>;
}

export function resolveOdooOrigin(
  request: Request,
  context: OdooRequestContext,
): string {
  const configured = String(envRecord(context).DTF_ODOO_ORIGIN ?? "").trim();
  const raw = configured || new URL(request.url).origin;
  const parsed = new URL(raw);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("DTF_ODOO_ORIGIN must use http or https.");
  }
  return parsed.origin;
}

export async function fetchOdooJson<T>(
  request: Request,
  context: OdooRequestContext,
  path: string,
): Promise<T> {
  if (!path.startsWith("/api/dtf/v1/")) {
    throw new Error("Only versioned DTF Odoo API paths are allowed.");
  }
  const target = new URL(path, resolveOdooOrigin(request, context));
  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.set("cookie", cookie);
  if (language) headers.set("accept-language", language);

  const response = await fetch(target, {
    method: "GET",
    headers,
    redirect: "manual",
  });
  if (!response.ok) {
    throw new Error(`Odoo API request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function mapOdooCategories(
  payload: { items?: OdooCategory[] } | null | undefined,
): LegacyStudioCategory[] {
  return (payload?.items ?? []).map((category) => ({
    id: String(category.id),
    nameAr: String(category.name_ar ?? category.name ?? ""),
    nameEn: String(category.name ?? ""),
    enabled: 1,
    homeFeatured: 0,
    homeOrder: Number(category.sequence ?? 0),
  }));
}

function optionValue(
  attributes: OdooVariantAttribute[] | undefined,
  matcher: RegExp,
): string | null {
  const match = (attributes ?? []).find((item) =>
    matcher.test(String(item.attribute ?? "")),
  );
  return match?.value ? String(match.value) : null;
}

export function mapOdooProducts(
  payload: { items?: OdooProduct[] } | null | undefined,
): LegacyStudioProduct[] {
  const rows: LegacyStudioProduct[] = [];
  for (const product of payload?.items ?? []) {
    for (const variant of product.variants ?? []) {
      rows.push({
        modelId: String(product.id),
        categoryId: String(product.category_ids?.[0] ?? ""),
        nameAr: String(product.name_ar ?? product.name ?? ""),
        nameEn: String(product.name ?? ""),
        variantId: String(variant.id),
        sku: String(variant.sku ?? ""),
        color: optionValue(
          variant.attributes,
          /^(color|colour|لون)$/i,
        ),
        size: optionValue(
          variant.attributes,
          /^(size|مقاس|حجم)$/i,
        ),
        retailPriceJod: Number(
          variant.price ?? Number(product.price ?? 0) + Number(variant.price_extra ?? 0),
        ),
        source: product.catalog_type === "customizable" ? "custom" : "manual",
      });
    }
  }
  return rows;
}
