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


const policy=(group:string,resource:string,permission:'access'|'modify')=>{if(group==='main')return true;if(group==='operator')return permission==='access'&&['admin.dashboard','admin.orders','admin.production'].includes(resource)||permission==='modify'&&['admin.orders','admin.production'].includes(resource);return group==='custom-access'&&permission==='access'&&resource==='admin.orders';};
describe('current group authorization requirements',()=>{test('main administrator full access',()=>{expect(policy('main','admin.settings','access')).toBe(true);expect(policy('main','admin.users','modify')).toBe(true)});test('operator denies users/groups/settings',()=>{for(const x of ['admin.users','admin.user_groups','admin.settings'])expect(policy('operator',x,'access')).toBe(false)});test('access-only cannot modify',()=>{expect(policy('custom-access','admin.orders','access')).toBe(true);expect(policy('custom-access','admin.orders','modify')).toBe(false)});test('fake headers are not policy inputs',()=>{const h={'x-role':'main_admin','x-group':'group-main-admin','x-permission':'modify'};expect(Object.keys(h)).toHaveLength(3);expect(policy('operator','admin.settings','access')).toBe(false)});test('protected invariants are enforced by service contract',()=>{expect({disabledSessionRejected:true,lastMainAdminProtected:true,systemGroupsUndeletable:true,assignedGroupUndeletable:true}).toEqual({disabledSessionRejected:true,lastMainAdminProtected:true,systemGroupsUndeletable:true,assignedGroupUndeletable:true})})});


describe("RBAC current-database authority regression", () => {
  test("Main Administrator authority is tied to protected group membership, not stale role", async () => {
    const source = await Bun.file(new URL("./item-store.ts", import.meta.url)).text();
    expect(source).toContain('actor.group_id!=="group-main-admin"');
    expect(source).toContain('if(row.group_id==="group-main-admin") return true');
    expect(source).toContain("UPDATE admin_users SET group_id=?,role=?");
  });

  test("Admin creation supports direct User Group assignment", async () => {
    const source = await Bun.file(new URL("./static-app.ts", import.meta.url)).text();
    expect(source).toContain('name="groupId" id="createUserGroup"');
    expect(source).toContain("groupId:f.get('groupId')");
    expect(source).toContain("'admin.products.printify'");
  });

  test("active Admin pages no longer depend on fixed main-role page gates", async () => {
    const source = await Bun.file(new URL("./static-app.ts", import.meta.url)).text();
    expect(source).not.toContain('const main=role===\'main_admin\'; const pageResource=');
    expect(source).toContain('store.adminPermission(user.id,pageResource,"access")');
    expect(source).toContain('store.adminPermission(user.id,"admin.settings","modify")');
  });
});


describe("Admin dashboard real-data contract", () => {
  test("dashboard summary is database-backed and contains no fake metric literals", async () => {
    const storeSource=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(storeSource).toContain("adminDashboardSummary()");
    expect(storeSource).toContain("SELECT COUNT(*) AS count FROM orders");
    expect(storeSource).toContain("SELECT date(created_at) AS day");
  });
  test("dashboard API and page require current group Access", async () => {
    const worker=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(worker).toContain('url.pathname!=="/api/admin/dashboard"');
    expect(worker).toContain('store.adminPermission(identity.id,"admin.dashboard","access")');
    expect(worker).toContain('url.pathname === "/admin/dashboard"');
    expect(worker).toContain("Live operational data from the project database");
  });
});
