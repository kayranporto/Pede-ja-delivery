"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261027090000_avisos_abertura_restaurante.sql"), "utf8");
const api = fs.readFileSync(path.join(root, "supabase/functions/api-completa/index.ts"), "utf8");
const client = fs.readFileSync(path.join(root, "js/core/supabase.js"), "utf8");
const moduleCode = fs.readFileSync(path.join(root, "js/modules/aviso-abertura-restaurante.js"), "utf8");
const page = fs.readFileSync(path.join(root, "html/restaurante.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

test("avisos de abertura ficam limitados ao cliente autenticado", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /usuario_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /unique \(usuario_id, empresa_id\)/);
  assert.match(api, /\/v1\/me\/avisos-abertura/);
  assert.match(api, /eq\("usuario_id",ctx\.userId\)/);
});

test("processamento respeita a disponibilidade real e usa a fila de push existente", () => {
  assert.match(migration, /private\.empresa_aberta_em\(a\.empresa_id::text, now\(\)\) = true/);
  assert.match(migration, /insert into public\.notificacoes/);
  assert.match(migration, /cron\.schedule/);
  assert.match(migration, /\* \* \* \* \*/);
});

test("cliente pode ativar e cancelar o aviso na página do restaurante", () => {
  assert.match(client, /meuAvisoAbertura/);
  assert.match(client, /criarAvisoAbertura/);
  assert.match(client, /cancelarAvisoAbertura/);
  assert.match(moduleCode, /Notification\.requestPermission\(\)/);
  assert.match(moduleCode, /pushManager\.subscribe/);
  assert.match(moduleCode, /cancelarAvisoAbertura\(empresaId\)/);
  assert.match(page, /notifications\.js\?v=4\.4\.9/);
  assert.match(page, /aviso-abertura-restaurante\.js\?v=1\.0\.0/);
  assert.match(worker, /addEventListener\("push"/);
});
