export const ADMIN_ORDER_STATUSES = [
  "new",
  "payment_pending",
  "payment_confirmed",
  "under_preparation",
  "ready_for_delivery",
  "given_to_delivery",
  "under_delivery",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export const ADMIN_ORDER_TRANSITIONS: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  new: ["payment_pending", "payment_confirmed", "cancelled"],
  payment_pending: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["under_preparation", "cancelled"],
  under_preparation: ["ready_for_delivery", "ready_for_pickup", "cancelled"],
  ready_for_delivery: ["given_to_delivery", "cancelled"],
  given_to_delivery: ["under_delivery"],
  under_delivery: ["completed"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: [],
};

export function normalizeAdminOrderStatus(value: unknown): AdminOrderStatus | null {
  const status = String(value ?? "").trim().toLowerCase();
  return (ADMIN_ORDER_STATUSES as readonly string[]).includes(status) ? status as AdminOrderStatus : null;
}

export function allowedAdminOrderTransitions(value: unknown): readonly AdminOrderStatus[] {
  const status = normalizeAdminOrderStatus(value);
  return status ? ADMIN_ORDER_TRANSITIONS[status] : [];
}

export function canTransitionAdminOrder(from: unknown, to: unknown): boolean {
  const current = normalizeAdminOrderStatus(from);
  const next = normalizeAdminOrderStatus(to);
  return Boolean(current && next && ADMIN_ORDER_TRANSITIONS[current].includes(next));
}
