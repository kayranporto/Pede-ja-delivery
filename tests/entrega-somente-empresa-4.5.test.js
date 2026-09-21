"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("4.5 força entrega própria em todas as unidades", () => {
  const migration = read("supabase/migrations/20260916214000_entrega_somente_empresa_4_5.sql");
  const hardening = read("supabase/migrations/20260917190000_entrega_somente_empresa_hardening_4_5.sql");
  for (const sql of [migration, hardening]) {
    assert.match(sql, /entrega_modalidade = 'propria'/);
    assert.match(sql, /empresa_unidades_entrega_modalidade_check/);
    assert.doesNotMatch(sql, /check \(entrega_modalidade in \('propria', 'plataforma', 'hibrida'\)\)/);
  }
});

test("entregador só fica online e aceita corrida dentro da própria empresa", () => {
  const sql = read("supabase/migrations/20260917190000_entrega_somente_empresa_hardening_4_5.sql");
  assert.match(sql, /empresa_entregadores v[\s\S]*entregador_id = auth\.uid\(\)/);
  assert.match(sql, /Você precisa estar vinculado a uma empresa/);
  assert.match(sql, /o\.origem = 'propria'/);
  assert.match(sql, /Este pedido pertence a uma empresa diferente da sua equipe/);
  assert.match(sql, /v\.empresa_id::text = p\.empresa_id::text/);
});

test("API expõe somente logística empresarial", () => {
  const api = read("supabase/functions/api-completa/index.ts");
  const openapi = JSON.parse(read("supabase/functions/api-completa/openapi.json"));
  for (const trecho of [
    "/v1/entregador/me",
    "/v1/entregador/pedidos",
    "/v1/entregador/entregas",
    "/v1/entregador/status",
    "empresa\\/pedidos",
    "/v1/empresa/entregadores"
  ]) assert.ok(api.includes(trecho), `API sem ${trecho}`);
  assert.ok(openapi.paths["/v1/empresa/entregadores"]);
  assert.ok(openapi.paths["/v1/entregador/me"]);
  assert.ok(openapi.paths["/v1/entregador/pedidos"]);
  assert.equal(openapi.info.version, "3.0.0");
  assert.doesNotMatch(api, /empresas_catalogo[^\n]*publicado/);
  assert.doesNotMatch(api, /empresas_catalogo[^\n]*eq\("publicado"/);
});

test("painel da empresa não oferece plataforma ou modo híbrido", () => {
  const dashboard = read("js/modules/empresa-entrega-propria-4.4.5.js");
  assert.match(dashboard, /exclusivamente entregadores vinculados à própria empresa/);
  assert.doesNotMatch(dashboard, /plataforma|hibrida/i);
  assert.doesNotMatch(dashboard, /window\.db\.(?:from|rpc)/);
});

test("painel do entregador depende de vínculo empresarial", () => {
  const driver = read("js/pages/entregador.js");
  assert.match(driver, /\/v1\/entregador\/me/);
  assert.match(driver, /Aguardando vínculo com uma empresa/);
  assert.match(driver, /\/v1\/entregador\/status/);
  assert.match(driver, /Aguardando o restaurante marcar como pronto/);
  assert.match(driver, /pedido\.pronto_em/);
  assert.doesNotMatch(driver, /db\.(?:from|rpc)/);
});
