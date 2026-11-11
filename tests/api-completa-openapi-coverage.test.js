"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const specification = JSON.parse(read("supabase/functions/api-completa/openapi.json"));
const implementation = read("supabase/functions/api-completa/index.ts");

const expectedOperations = [
  ["GET", "/v1/categorias-filtros"],
  ["GET", "/v1/me/avisos-abertura"],
  ["POST", "/v1/me/avisos-abertura"],
  ["DELETE", "/v1/me/avisos-abertura/{empresaId}"],
  ["GET", "/v1/empresa/relatorios/financeiro"],
  ["GET", "/v1/empresa/relatorios/financeiro-acesso"],
  ["GET", "/v1/empresa/relatorios/operacional"],
  ["POST", "/v1/admin/categorias-filtros"],
  ["PATCH", "/v1/admin/categorias-filtros/{id}"],
  ["DELETE", "/v1/admin/categorias-filtros/{id}"],
  ["POST", "/v1/me/push-subscription"],
  ["POST", "/v1/empresa/inicializar"],
  ["POST", "/v1/enderecos"],
  ["DELETE", "/v1/enderecos/{id}"],
  ["PATCH", "/v1/enderecos/{id}/localizacao"],
  ["POST", "/v1/empresa/pedido/cancelar"],
  ["POST", "/v1/empresa/pedido/cancelamento"],
  ["POST", "/v1/empresa/pagamento-offline"],
  ["POST", "/v1/favoritos"],
  ["DELETE", "/v1/favoritos/{id}"],
  ["GET", "/v1/pedidos/{id}/avaliacao"]
];

test("OpenAPI documenta as operações adicionais encontradas no roteador", () => {
  for (const [method, route] of expectedOperations) {
    assert.ok(
      specification.paths[route]?.[method.toLowerCase()],
      `OpenAPI sem ${method} ${route}`
    );
  }
});

test("rota de exclusão de entregador próprio chama RPC proprietária com IDs validados", () => {
  const deleteHandler = implementation.slice(implementation.indexOf("async function handleDelete"));
  assert.match(deleteHandler, /const ownDriver = ctx\.path\.match/);
  assert.match(deleteHandler, /empresa_remover_entregador_proprio/);
  assert.match(deleteHandler, /p_unidade_id:unidadeId,p_entregador_id:ownDriver\[1\]/);
  assert.match(deleteHandler, /uuid\(ownDriver\[1\]\)/);
  assert.match(deleteHandler, /uuid\(String\(unidadeId \|\| ""\)\)/);
});

test("categorias de filtros são públicas somente para leitura; mutações exigem administração", () => {
  assert.deepEqual(specification.paths["/v1/categorias-filtros"].get.security, []);
  assert.equal(specification.paths["/v1/admin/categorias-filtros"].post.security, undefined);
  assert.equal(specification.paths["/v1/admin/categorias-filtros/{id}"].patch.security, undefined);
  assert.equal(specification.paths["/v1/admin/categorias-filtros/{id}"].delete.security, undefined);
});

test("remoção de entregador próprio exige a unidade além do UUID do vínculo", () => {
  const operation = specification.paths["/v1/empresa/entregadores/{id}"].delete;
  assert.ok(operation.parameters.some((item) => item.in === "query" && item.name === "unidade_id" && item.required === true));
  assert.ok(operation.parameters.some((item) => item.in === "path" && item.name === "id" && item.required === true));
});
