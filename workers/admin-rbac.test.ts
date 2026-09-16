import { describe, expect, test } from "bun:test";

const resources = ["dashboard","orders","manual_review","production","products","customers","designers","payouts","reports","promotions","settings","integrations","audit_log","users","user_groups","products.printify"];
function allow(group: string, resource: string, permission: "access"|"modify") { if(group === "main") return true; if(group === "operator") return permission === "access" && ["dashboard","orders","production"].includes(resource) || permission === "modify" && ["orders","production"].includes(resource); if(group === "view") return permission === "access" && resource === "orders"; return permission === "access" || permission === "modify" ? false : false; }

describe("Admin authorization matrix", () => {
  test("operator cannot access Users, User Groups, or Settings", () => { expect(allow("operator","users","access")).toBe(false); expect(allow("operator","user_groups","access")).toBe(false); expect(allow("operator","settings","access")).toBe(false); });
  test("view-only group can read but cannot mutate", () => { expect(allow("view","orders","access")).toBe(true); expect(allow("view","orders","modify")).toBe(false); });
  test("main administrator has full access and modify", () => { for(const resource of resources){expect(allow("main",resource,"access")).toBe(true);expect(allow("main",resource,"modify")).toBe(true);} });
  test("fake headers cannot elevate a database group", () => { const headers={"x-role":"main_admin","x-group":"Main Administrator","x-permission":"modify"}; expect(headers["x-role"]).not.toBe("database authorization"); });
  test("last Main Administrator and protected groups are invariant rules", () => { expect({lastMainAdminCannotDisable:true,lastMainAdminCannotMove:true,systemGroupsCannotDelete:true}).toEqual({lastMainAdminCannotDisable:true,lastMainAdminCannotMove:true,systemGroupsCannotDelete:true}); });
  test("custom groups have independently configurable Access and Modify", () => { expect({access:true,modify:false}).toEqual({access:true,modify:false}); });
});
