export const ADMIN_WITHDRAWAL_STATUSES = ["requested","approved","rejected","paid"] as const;
export type AdminWithdrawalStatus = (typeof ADMIN_WITHDRAWAL_STATUSES)[number];

export const ADMIN_WITHDRAWAL_TRANSITIONS: Record<AdminWithdrawalStatus, readonly AdminWithdrawalStatus[]> = {
  requested: ["approved","rejected"],
  approved: ["paid"],
  rejected: [],
  paid: [],
};

export function normalizeAdminWithdrawalStatus(value: unknown): AdminWithdrawalStatus | null {
  const status=String(value??"").trim().toLowerCase();
  return (ADMIN_WITHDRAWAL_STATUSES as readonly string[]).includes(status) ? status as AdminWithdrawalStatus : null;
}

export function allowedAdminWithdrawalTransitions(value: unknown): readonly AdminWithdrawalStatus[] {
  const status=normalizeAdminWithdrawalStatus(value);
  return status ? ADMIN_WITHDRAWAL_TRANSITIONS[status] : [];
}

export function canTransitionAdminWithdrawal(from: unknown,to: unknown): boolean {
  const current=normalizeAdminWithdrawalStatus(from),next=normalizeAdminWithdrawalStatus(to);
  return Boolean(current&&next&&ADMIN_WITHDRAWAL_TRANSITIONS[current].includes(next));
}
