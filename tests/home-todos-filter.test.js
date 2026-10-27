"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "js/pages/home.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

test("Home oferece Todos como filtro independente das categorias cadastradas", () => {
  assert.match(html, /class="categoria ativa" data-categoria="" aria-pressed="true"><div aria-hidden="true">🍽️<\/div><span>Todos<\/span>/);
  assert.match(home, /botaoTodos\.dataset\.categoria = ""/);
  assert.match(home, /nomeTodos\.textContent = "Todos"/);
  assert.match(home, /\.filter\(\(categoria\) => !\["todos", "todas"\]\.includes\(normalizar\(categoria\?\.nome\)\.trim\(\)\)\)/);
});

test("selecionar Todos remove o filtro de categoria e preserva os filtros de busca", () => {
  assert.match(home, /categoriaSelecionada = categoria\.dataset\.categoria \|\| ""/);
  assert.match(home, /const termosCategoria = \[categoria, \.\.\.aliasesCategoriaSelecionada\]/);
  assert.match(home, /const correspondeCategoria = !termosCategoria\.length/);
  assert.match(home, /\(!texto \|\| conteudo\.includes\(texto\) \|\| idsProdutos\.has\(String\(empresa\.id\)\)\)/);
});

test("service worker carrega a versão atualizada do script da Home", () => {
  assert.match(html, /home\.js\?v=4\.5\.7/);
  assert.match(worker, /\.\/js\/pages\/home\.js\?v=4\.5\.7/);
});
