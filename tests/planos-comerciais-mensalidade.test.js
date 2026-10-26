"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migrationPath = "supabase/migrations/20261026190000_planos_comerciais_mensalidade.sql";

test("planos comerciais cobram mensalidade fixa sem comissão", () => {
  const sql = read(migrationPath);
  assert.match(sql, /'basico'[\s\S]*?49\.90/);
  assert.match(sql, /'profissional'[\s\S]*?99\.90/);
  assert.match(sql, /'premium'[\s\S]*?199\.90/);
  assert.equal((sql.match(/"comissao_pedidos_percentual":0/g) || []).length, 3);
  assert.match(sql, /"modelo_cobranca":"mensalidade_fixa"/);
});

test("plano Básico é padrão apenas para novos restaurantes e Legado é preservado", () => {
  const sql = read(migrationPath);
  assert.match(sql, /where padrao_novos = true/);
  assert.match(sql, /padrao_novos = \(slug = 'basico'\)/);
  assert.match(sql, /Mantém a garantia[\s\S]*?sem alterar as assinaturas já atribuídas/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.empresa_assinaturas/i);
});

test("migration de planos é idempotente e não ativa cobrança recorrente", () => {
  const sql = read(migrationPath);
  assert.match(sql, /on conflict \(slug\) do update/i);
  assert.match(sql, /cobrança recorrente não é ativada/i);
  assert.match(sql, /begin;[\s\S]*commit;/i);
});
