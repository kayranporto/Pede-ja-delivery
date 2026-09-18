"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("dashboard carrega os módulos multiunidade 4.3", () => {
  const enhancements = read("js/core/site-enhancements.js");
  assert.match(enhancements, /empresa-unidades-4\.3\.js/);
  assert.match(enhancements, /operacao-unidades-4\.3\.js/);
  assert.match(enhancements, /empresa-dashboard\\\.html/);
});

test("multiunidade usa API para carregar pedidos e catálogo da unidade", () => {
  const source = read("js/modules/empresa-unidades-4.3.js");
  assert.match(source, /DeliveryAPI\.empresaOperacao/);
  assert.match(source, /DeliveryAPI\.empresaOperacaoAcao/);
  assert.match(source, /unidadeAtivaId/);
  assert.doesNotMatch(source, /window\.db\.(?:from|rpc)/);
});

test("novas categorias e produtos passam pela API centralizada", () => {
  const source = read("js/modules/empresa-unidades-4.3.js");
  assert.match(source, /empresaOperacaoAcao/);
  assert.match(source, /acao: "categoria_criar"/);
  assert.match(source, /acao: "produto_salvar"/);
  assert.match(source, /unidadeAtivaId/);
  assert.doesNotMatch(source, /window\.db\.(?:from|rpc)/);
});

test("unidade principal não pode ser desativada pela interface", () => {
  const source = read("js/modules/empresa-unidades-4.3.js");
  assert.match(source, /if \(unidade\.principal && unidade\.ativa\)/);
  assert.match(source, /unidade principal não pode ser desativada/i);
});

test("restaurante público carrega somente catálogo da unidade escolhida", () => {
  const source = read("js/modules/restaurante-unidades-4.3.js");
  assert.match(source, /DeliveryAPI\.restauranteUnidadesPublicas/);
  assert.match(source, /DeliveryAPI\.cardapio/);
  assert.doesNotMatch(source, /window\.db\.(?:from|rpc)/);
  assert.match(source, /unidade_id: String\(unidade\.id\)/);
  assert.match(source, /Trocar e limpar carrinho/);
});

test("status público acompanha a unidade selecionada", () => {
  const source = read("js/modules/restaurante-status-unidade-4.3.js");
  assert.match(source, /DeliveryAPI\.disponibilidadeUnidade/);
  assert.match(source, /unidade_aberta: aberto/);
  assert.match(source, /empresa-carregada/);
});

test("checkout roteia cálculo, disponibilidade e criação pela unidade", () => {
  const source = read("js/pages/checkout.js");
  assert.match(source, /DeliveryAPI\.calcularEntrega/);
  assert.match(source, /DeliveryAPI\.criarPedido/);
  assert.match(source, /unidade_id: carrinhoMeta\.unidade_id/);
  assert.doesNotMatch(source, /window\.db\.rpc/);
  const module = read("js/modules/checkout-unidade-4.3.js");
  assert.match(module, /unidade_id/);
});

test("migration pública valida unidade e rejeita produto de outra unidade", () => {
  const sql = read("supabase/migrations/20260814005954_multiunidade_publica_4_3.sql");
  assert.match(sql, /create or replace function public\.empresa_unidades_publicas/);
  assert.match(sql, /create or replace function public\.criar_pedido_operacional_unidade/);
  assert.match(sql, /p\.unidade_id is distinct from p_unidade_id/);
  assert.match(sql, /O carrinho contém produto indisponível ou de outra unidade/);
  assert.match(sql, /grant execute on function public\.criar_pedido_operacional_unidade[\s\S]*to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.criar_pedido_operacional_unidade[\s\S]*to anon/);
});

test("operação 4.3 usa API centralizada e preserva o filtro por unidade", () => {
  const source = read("js/modules/operacao-unidades-4.3.js");
  assert.match(source, /DeliveryAPI\.empresaOperacao/);
  assert.match(source, /DeliveryAPI\.empresaOperacaoAcao/);
  assert.doesNotMatch(source, /window\.db\.(?:from|rpc)/);
});

test("migration 030 move operação para unidade e mantém fallback principal", () => {
  const sql = read("supabase/migrations/20260814010928_operacao_por_unidade_4_3.sql");
  for (const tabela of ["empresa_horarios", "empresa_pausas", "empresa_regioes"]) {
    assert.match(sql, new RegExp(`alter table public\\.${tabela}[\\s\\S]{0,120}add column if not exists unidade_id`));
  }
  assert.match(sql, /primary key \(empresa_id, unidade_id, dia_semana\)/);
  assert.match(sql, /private\.empresa_aberta_unidade_em/);
  assert.match(sql, /private\.calcular_entrega_unidade_impl/);
  assert.match(sql, /public\.empresa_disponibilidade_unidade/);
  assert.match(sql, /public\.calcular_entrega_unidade/);
  assert.match(sql, /where u\.empresa_id::text = p_empresa_id::text and u\.principal and u\.ativa/);
});

test("migration 031 impede unidade de outra empresa", () => {
  const sql = read("supabase/migrations/20260814011033_integridade_empresa_unidade_4_3.sql");
  assert.match(sql, /unique \(id, empresa_id\)/);
  for (const tabela of ["produtos", "categorias", "pedidos", "empresa_horarios", "empresa_pausas", "empresa_regioes"]) {
    assert.match(sql, new RegExp(`alter table public\\.${tabela}[\\s\\S]{0,180}foreign key \\(unidade_id, empresa_id\\)`));
  }
});

test("camada empresarial está centralizada na API", () => {
  for (const arquivo of [
    "js/modules/empresa-unidades-4.3.js",
    "js/modules/operacao-unidades-4.3.js",
    "js/modules/operacao-empresa.js",
    "js/pages/empresa-dashboard.js"
  ]) {
    const source = read(arquivo);
    assert.doesNotMatch(source, /window\.db\.(?:from|rpc)/);
    assert.doesNotMatch(source, /\bdb\.(?:from|rpc)/);
    assert.match(source, /DeliveryAPI\./);
  }
  const openapi = JSON.parse(read("supabase/functions/api-completa/openapi.json"));
  for (const rota of ["/v1/empresa/unidades", "/v1/empresa/operacao", "/v1/empresa/painel"]) {
    assert.ok(openapi.paths[rota], `OpenAPI sem ${rota}`);
  }
});
