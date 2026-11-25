"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const adminPage = fs.readFileSync(path.join(root, "js/pages/admin.js"), "utf8");
const adminUsersFunction = fs.readFileSync(path.join(root, "supabase/functions/admin-usuarios/index.ts"), "utf8");

test("somente kayranporto12@gmail.com pode editar permissões de outros administradores", () => {
  assert.match(adminPage, /const ADMIN_EMAIL_GESTOR_PERMISSOES = "kayranporto12@gmail\.com"/);
  assert.match(adminUsersFunction, /const PERMISSION_MANAGER_EMAIL = "kayranporto12@gmail\.com"/);
  assert.match(adminUsersFunction, /if \(acao === "salvar_permissoes" && !gestorPermissoes\)/);
  assert.match(adminUsersFunction, /return fail\("Somente " \+ PERMISSION_MANAGER_EMAIL \+ " pode alterar as permissões de outros administradores\.", 403\)/);
  assert.match(adminPage, /if \(!podeEditarPermissoesAdmin\(\)\)/);
});
