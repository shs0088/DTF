export const ADMIN_PRODUCTION_STATUSES = ["queued","printing","qc","completed","cancelled"] as const;
export type AdminProductionStatus = (typeof ADMIN_PRODUCTION_STATUSES)[number];

export const ADMIN_PRODUCTION_TRANSITIONS: Record<AdminProductionStatus, readonly AdminProductionStatus[]> = {
  queued: ["printing","cancelled"],
  printing: ["qc","cancelled"],
  qc: ["completed","cancelled"],
  completed: [],
  cancelled: [],
};

export function normalizeAdminProductionStatus(value: unknown): AdminProductionStatus | null {
  const status=String(value??"").trim().toLowerCase();
  return (ADMIN_PRODUCTION_STATUSES as readonly string[]).includes(status) ? status as AdminProductionStatus : null;
}
export function allowedAdminProductionTransitions(value: unknown): readonly AdminProductionStatus[] {
  const status=normalizeAdminProductionStatus(value);
  return status ? ADMIN_PRODUCTION_TRANSITIONS[status] : [];
}
export function canTransitionAdminProduction(from: unknown,to: unknown): boolean {
  const current=normalizeAdminProductionStatus(from),next=normalizeAdminProductionStatus(to);
  return Boolean(current&&next&&ADMIN_PRODUCTION_TRANSITIONS[current].includes(next));
}
