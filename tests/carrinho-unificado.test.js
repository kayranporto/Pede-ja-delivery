"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/modules/carrinho-unificado.js"), "utf8");

function carregar(itens = [], dadosMeta = null) {
    const eventos = [];
    const contexto = {
        window: {},
        localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        },
        CustomEvent: class CustomEvent {
            constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
        },
        structuredClone,
    };
    contexto.window = contexto;
    contexto.window.dispatchEvent = (evento) => eventos.push(evento);
    contexto.window.CartStore = {
        ler: () => itens,
        meta: () => dadosMeta,
        salvar: (novos, meta) => { itens = novos; dadosMeta = meta; },
    };
    vm.runInNewContext(source, contexto);
    return contexto.window.CarrinhoUnificado;
}

test("normaliza quantidade, preço, observação e adicionais", () => {
    const api = carregar();
    const item = api.normalizarItem({
        id: 10,
        nome: "Pizza",
        preco: "25.50",
        quantidade: 120,
        observacao: "x".repeat(400),
        adicionais: [{ id: 2, nome: "Borda", preco: "5" }],
    });
    assert.equal(item.id, "10");
    assert.equal(item.preco, 25.5);
    assert.equal(item.quantidade, 99);
    assert.equal(item.observacao.length, 300);
    assert.equal(item.adicionais[0].preco, 5);
    assert.ok(item.chave.includes("10|sem-variante|2|"));
});

test("calcula total do item e do carrinho", () => {
    const api = carregar();
    const item = api.normalizarItem({ id: "p1", preco: 20, quantidade: 2, adicionais: [{ id: "a1", preco: 3 }] });
    assert.equal(api.totalItem(item), 46);
    assert.equal(api.total([item]), 46);
});

test("encontra item pela chave normalizada", () => {
    const api = carregar();
    const item = api.normalizarItem({ id: "p1", preco: 10, quantidade: 1 });
    assert.equal(api.encontrar(item.chave, [item]).id, "p1");
});

test("expõe limites e API pública", () => {
    const api = carregar();
    assert.equal(api.limiteQuantidade, 99);
    assert.equal(api.limiteObservacao, 300);
    for (const nome of ["ler", "meta", "salvar", "normalizarItem", "chaveItem", "totalItem", "total", "encontrar"]) {
        assert.equal(typeof api[nome], "function", `${nome} não foi exposta`);
    }
});
