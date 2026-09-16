export const ADMIN_ORDER_STATUSES = [
  { id: "new", label: "New" },
  { id: "payment_pending", label: "Payment Pending" },
  { id: "payment_confirmed", label: "Payment Confirmed" },
  { id: "under_preparation", label: "Under Preparation" },
  { id: "ready_for_delivery", label: "Ready for Delivery" },
  { id: "given_to_delivery", label: "Given to Delivery" },
  { id: "under_delivery", label: "Under Delivery" },
  { id: "ready_for_pickup", label: "Ready for Pickup" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" }
] as const;

const TRANSITIONS: Record<string, readonly string[]> = {
  new: ["payment_pending", "payment_confirmed", "cancelled"],
  payment_pending: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["under_preparation", "cancelled"],
  under_preparation: ["ready_for_delivery", "ready_for_pickup", "cancelled"],
  ready_for_delivery: ["given_to_delivery", "cancelled"],
  given_to_delivery: ["under_delivery"],
  under_delivery: ["completed"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: []
};

export function allowedAdminOrderTransitions(status: string): string[] {
  return [...(TRANSITIONS[String(status || "").toLowerCase()] ?? [])];
}

export function isValidAdminOrderTransition(fromStatus: string, toStatus: string): boolean {
  return allowedAdminOrderTransitions(fromStatus).includes(String(toStatus || "").toLowerCase());
}
