import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./workers/item-store.ts", import.meta.url), "utf8");

describe("ItemStore initialization regression", () => {
  test("executes constructor and bootstrap SQL as bounded statements", () => {
    expect(source).toContain("function execSqlScript(storage: SqlStorage, script: string): void");
    expect(source).toContain("execSqlScript(this.ctx.storage.sql, `\n      PRAGMA foreign_keys = ON;");
    expect(source).toContain("execSqlScript(this.ctx.storage.sql, `\n      INSERT OR REPLACE INTO schema_meta");
    expect(source).not.toMatch(/this\.ctx\.storage\.sql\.exec\(`\s*\n\s*PRAGMA foreign_keys/);
    expect(source).not.toMatch(/this\.ctx\.storage\.sql\.exec\(`\s*\n\s*INSERT OR REPLACE INTO schema_meta/);
  });


  test("does not place TypeScript control flow inside initialization SQL", () => {
    const sqlTemplates = [...source.matchAll(/execSqlScript\(this\.ctx\.storage\.sql, `([\s\S]*?)`\);/g)].map((match) => match[1]);
    expect(sqlTemplates.length).toBe(2);
    for (const sql of sqlTemplates) {
      expect(sql).not.toContain("try {");
      expect(sql).not.toContain("this.ctx.storage");
      expect(sql).not.toContain("catch");
    }
    expect(source).toContain("ALTER TABLE admin_users ADD COLUMN group_id TEXT");
    expect(source).toContain("if (!/already exists|duplicate column name/i.test(message)) throw error;");
    expect(source.indexOf("ALTER TABLE admin_users ADD COLUMN group_id TEXT")).toBeLessThan(source.indexOf("UPDATE admin_users SET group_id="));
  });

  test("keeps admin login query and idempotent bootstrap path intact", () => {
    expect(source).toContain("async loginAdmin(username: string, password: string)");
    expect(source).toContain("SELECT id,username,password_salt,password_hash,role FROM admin_users WHERE username=? AND enabled=1");
    expect(source).toContain("this.bootstrapCatalog();\n    const clean = String(username || \"\").trim().toLowerCase();");
    expect(source).toContain("INSERT OR IGNORE INTO admin_user_groups");
    expect(source).toContain("INSERT OR IGNORE INTO admin_group_permissions");
    const sqlTemplates = [...source.matchAll(/execSqlScript\(this\.ctx\.storage\.sql, `([\s\S]*?)`\);/g)].map((match) => match[1]);
    expect(sqlTemplates.length).toBe(2);
    const initializationSql = sqlTemplates.join("\n");
    expect(initializationSql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(initializationSql).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
    expect(initializationSql).not.toMatch(/\bDELETE\s+FROM\s+admin_users\b/i);
    expect(initializationSql).not.toMatch(/\bDELETE\s+FROM\s+schema_meta\b/i);
  });
});

test("ItemStore bootstrap remains repeatable without destructive schema operations", () => {
  const bootstrapCalls = (source.match(/this\.bootstrapCatalog\(\);/g) || []).length;
  expect(bootstrapCalls).toBeGreaterThan(1);
  expect(source).toContain("CREATE TABLE IF NOT EXISTS admin_users");
  expect(source).toContain("CREATE TABLE IF NOT EXISTS items");
});
