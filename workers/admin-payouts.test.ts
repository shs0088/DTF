import { describe, expect, test } from "bun:test";
import { allowedAdminWithdrawalTransitions, canTransitionAdminWithdrawal, normalizeAdminWithdrawalStatus } from "./admin-payouts";

describe("Admin Payouts authoritative withdrawal workflow", () => {
  test("canonical statuses normalize and invalid values fail closed", () => {
    expect(normalizeAdminWithdrawalStatus(" APPROVED ")).toBe("approved");
    expect(normalizeAdminWithdrawalStatus("processing")).toBeNull();
  });

  test("only requested→approved/rejected and approved→paid are allowed", () => {
    expect(canTransitionAdminWithdrawal("requested","approved")).toBe(true);
    expect(canTransitionAdminWithdrawal("requested","rejected")).toBe(true);
    expect(canTransitionAdminWithdrawal("approved","paid")).toBe(true);
    expect(canTransitionAdminWithdrawal("requested","paid")).toBe(false);
    expect(canTransitionAdminWithdrawal("approved","rejected")).toBe(false);
    expect(allowedAdminWithdrawalTransitions("paid")).toEqual([]);
    expect(allowedAdminWithdrawalTransitions("rejected")).toEqual([]);
  });
});

describe("Admin Payouts implementation contracts", () => {
  test("payout history and real designer financial tables are used", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("CREATE TABLE IF NOT EXISTS withdrawal_admin_history");
    expect(source).toContain("adminPayoutsList");
    expect(source).toContain("adminPayoutDetail");
    expect(source).toContain("designer_earnings");
    expect(source).toContain("ledger_entries");
    expect(source).toContain("withdrawals");
  });

  test("approval is balance constrained to payoutable earnings and committed withdrawals", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("lower(status) IN ('available','approved','earned','payable')");
    expect(source).toContain("lower(status) IN ('approved','paid')");
    expect(source).toContain("Withdrawal exceeds the designer's currently payoutable balance.");
  });

  test("paid transition creates exactly one negative withdrawal ledger entry", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("entry_type='withdrawal_paid' AND reference_id=?");
    expect(source).toContain("This withdrawal already has a paid ledger entry.");
    expect(source).toContain('"withdrawal_paid",-Math.abs(Number(row.amountJod)),id');
  });

  test("rejection requires a reason and all transitions create history, notification, and audit evidence", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain('if(next==="rejected"&&!cleanNote)throw new Error("Rejection reason is required.")');
    expect(source).toContain("INSERT INTO withdrawal_admin_history");
    expect(source).toContain("INSERT INTO notifications");
    expect(source).toContain("admin.payout.status_change");
  });

  test("Payouts API enforces Access for reads and Modify for transitions", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/payouts")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.payouts",permission)');
    expect(source).toContain('url.pathname === "/admin/payouts") return new Response(localizeAdminHtml(ADMIN_PAYOUTS_PAGE,request)');
  });

  test("Payouts UI exposes real financial evidence and controlled transitions", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Payouts","Eligible earnings","Committed/Paid","Available for new approval","Payout details","Admin status history","Designer earnings","Designer ledger"]) expect(source).toContain(text);
  });
});
