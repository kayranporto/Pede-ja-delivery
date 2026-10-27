"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const api = fs.readFileSync(path.join(root, "supabase/functions/api-completa/index.ts"), "utf8");
const adminPage = fs.readFileSync(path.join(root, "js/pages/admin.js"), "utf8");
const operationModule = fs.readFileSync(path.join(root, "js/modules/operacao-admin.js"), "utf8");

test("API mantém compatibilidade dos administradores antigos sem admin_permissions", () => {
  const normalizer = api.match(/function normalizeAdminPermissions\(value: unknown\): Set<string> \{[\s\S]*?\n\}/)?.[0];
  assert.ok(normalizer, "normalizeAdminPermissions precisa existir");
  assert.match(normalizer, /if \(!Array\.isArray\(value\) \|\| value\.length === 0\) return todas/);
  assert.match(normalizer, /return permissões\.size \? permissões : todas/);
  assert.match(adminPage, /if \(!Array\.isArray\(valor\) \|\| !valor\.length\) return new Set\(ADMIN_PERMISSOES\.map/);
});

test("falhas da central administrativa não são rotuladas incorretamente como migração pendente", () => {
  assert.doesNotMatch(operationModule, /Execute a migração 014/);
  assert.match(operationModule, /Falha ao carregar a operação/);
});
