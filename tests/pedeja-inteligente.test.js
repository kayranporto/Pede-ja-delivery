"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("PedeJá Inteligente usa histórico autenticado, preferências, orçamento e período", () => {
    const source = read("js/modules/pedeja-inteligente.js");
    assert.match(source, /DeliveryAPI\.meusPedidos\(\)/);
    assert.match(source, /window\.db\?\.auth\?\.getSession\(\)/);
    assert.match(source, /inteligenteCategoria/);
    assert.match(source, /inteligenteOrcamento/);
    assert.match(source, /periodoAtual\(\)/);
    assert.match(source, /pedido_minimo/);
    assert.match(source, /Não encontramos opções dentro desse orçamento/);
});

test("PedeJá Inteligente tem seção responsiva e filtros acessíveis na Home", () => {
    const html = read("index.html");
    const css = read("css/pages/pedeja-inteligente.css");
    assert.match(html, /id="pedejaInteligente"/);
    assert.match(html, /id="inteligenteCategoria"/);
    assert.match(html, /id="inteligenteOrcamento"/);
    assert.match(html, /js\/modules\/pedeja-inteligente\.js/);
    assert.match(css, /@media\(max-width:900px\)/);
    assert.match(css, /@media\(max-width:520px\)/);
});