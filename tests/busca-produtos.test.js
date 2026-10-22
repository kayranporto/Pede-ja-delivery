"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("busca pública de produtos pesquisa nomes, descrições e variantes sem autenticação", () => {
    const source = read("supabase/functions/api-completa/index.ts");
    const api = read("js/core/supabase.js");

    assert.ok(source.includes(String.raw`/^\/v1\/produtos\/buscar\/?$/`));
    assert.match(source, /if \(p === "\/v1\/produtos\/buscar"\) return searchPublicProducts\(ctx\)/);
    assert.match(source, /\.ilike\("nome", pattern\)/);
    assert.match(source, /\.ilike\("descricao", pattern\)/);
    assert.match(source, /\.from\("produto_variantes"\)/);
    assert.match(source, /\.eq\("disponivel", true\)/);
    assert.match(source, /\.eq\("status", true\)/);
    assert.match(api, /async buscarProdutos\(busca, limite = 20\)/);
});

test("busca da página inicial usa debounce e cache e inclui restaurantes encontrados pelo produto", () => {
    const home = read("js/pages/home.js");

    assert.match(home, /cacheBuscaProdutos\.get\(chave\)/);
    assert.match(home, /window\.setTimeout\(async \(\) => \{/);
    assert.match(home, /\}, 350\);/);
    assert.match(home, /idsProdutos\.has\(String\(empresa\.id\)\)/);
    assert.match(home, /pesquisa\?\.addEventListener\("input", \(\) => \{/);
    assert.match(home, /pesquisaMobile\?\.addEventListener\("input"/);
    assert.match(home, /programarBuscaProdutos\(\)/);
});

test("OpenAPI documenta a busca pública de produtos", () => {
    const specification = JSON.parse(read("supabase/functions/api-completa/openapi.json"));

    assert.ok(specification.paths["/v1/produtos/buscar"].get);
    assert.equal(specification.paths["/v1/produtos/buscar"].get.security.length, 0);
});
