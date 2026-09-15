export interface NormalizedPrintifyVariant {
  blueprintId: string;
  printProviderId: string;
  variantId: string;
  sourceTitle: string;
  size: unknown;
  color: unknown;
  options: Record<string, unknown>;
  sourceAvailable: boolean;
  sourceCostInternal: number | null;
  metadata: unknown;
  images: unknown[];
  placeholders: unknown;
}

export function normalizePrintifyVariant(blueprintId: string, providerId: string, raw: any): NormalizedPrintifyVariant | null {
  const variantId = String(raw?.id ?? raw?.variant_id ?? raw?.variantId ?? "");
  if (!/^\d{1,30}$/.test(variantId)) return null;
  const options = raw?.options && typeof raw.options === "object" ? raw.options : {};
  const sourceAvailable = raw?.sourceAvailable === undefined
    ? (raw?.is_enabled !== false && raw?.available !== false)
    : raw.sourceAvailable !== false;
  const rawCost = raw?.sourceCostInternal !== undefined
    ? Number(raw.sourceCostInternal)
    : (raw?.cost == null ? (raw?.cost_jod == null ? null : Number(raw.cost_jod)) : Number(raw.cost));
  const sourceCostInternal = rawCost == null || !Number.isFinite(rawCost) ? null : rawCost;
  return {
    blueprintId: String(blueprintId),
    printProviderId: String(providerId),
    variantId,
    sourceTitle: String(raw?.sourceTitle ?? raw?.title ?? raw?.name ?? "").slice(0, 300),
    size: raw?.size ?? options.size ?? null,
    color: raw?.color ?? options.color ?? null,
    options,
    sourceAvailable,
    sourceCostInternal,
    metadata: raw?.metadata ?? raw,
    images: Array.isArray(raw?.images) ? raw.images : [],
    placeholders: raw?.placeholders ?? raw?.print_areas ?? {}
  };
}

export interface PrintifyPublishValidationInput {
  titleEn: unknown;
  titleAr: unknown;
  descriptionEn: unknown;
  descriptionAr: unknown;
  customerPriceMinor: unknown;
  displayImage: unknown;
  selectedProviderId: unknown;
  sourceAvailable: boolean;
  validEnabledVariantCount: number;
}

export function validatePrintifyPublishState(input: PrintifyPublishValidationInput): string[] {
  const errors: string[] = [];
  if (!String(input.titleEn ?? "").trim()) errors.push("English title is required.");
  if (!String(input.titleAr ?? "").trim()) errors.push("Arabic title is required.");
  if (!String(input.descriptionEn ?? "").trim()) errors.push("English description is required.");
  if (!String(input.descriptionAr ?? "").trim()) errors.push("Arabic description is required.");
  const price = Number(input.customerPriceMinor);
  if (!(price > 0 && Number.isFinite(price))) errors.push("A valid customer price is required.");
  if (!String(input.displayImage ?? "").trim()) errors.push("Main Display Image is required.");
  if (!String(input.selectedProviderId ?? "").trim()) errors.push("A Print Provider must be selected.");
  if (!input.sourceAvailable) errors.push("Source product is unavailable.");
  if (!(Number.isInteger(input.validEnabledVariantCount) && input.validEnabledVariantCount > 0)) {
    errors.push("At least one valid enabled variant must be selected.");
  }
  return errors;
}
