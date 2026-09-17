"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function carregarModulo({ itens = [], dadosMeta = null } = {}) {
    const eventos = [];
    const armazenamento = new Map();
    armazenamento.set("carrinho", JSON.stringify(itens));
    if (dadosMeta) armazenamento.set("carrinhoMeta", JSON.stringify(dadosMeta));

    const window = {
        CartStore: {
            ler: () => itens,
            meta: () => dadosMeta,
            salvar: (novosItens, novaMeta) => {
                itens = novosItens;
                dadosMeta = novaMeta;
            },
        },
        dispatchEvent: (evento) => eventos.push(evento.type),
    };

    const context = vm.createContext({
        window,
        localStorage: {
            getItem: (chave) => armazenamento.get(chave) ?? null,
            setItem: (chave, valor) => armazenamento.set(chave, String(valor)),
            removeItem: (chave) => armazenamento.delete(chave),
        },
        CustomEvent: function CustomEvent(type) {
            this.type = type;
        },
    });

    const arquivo = path.join(__dirname, "..", "js", "modules", "carrinho-unificado.js");
    vm.runInContext(fs.readFileSync(arquivo, "utf8"), context, { filename: arquivo });
    return { api: window.CarrinhoUnificado, eventos };
}

test("expõe a API pública do carrinho unificado", () => {
    const { api } = carregarModulo();
    assert.ok(api);
    assert.equal(typeof api.ler, "function");
    assert.equal(typeof api.normalizarItem, "function");
    assert.equal(typeof api.chaveItem, "function");
    assert.equal(typeof api.totalItem, "function");
    assert.equal(typeof api.total, "function");
});

test("normaliza limites, tipos e adicionais", () => {
    const { api } = carregarModulo();
    const item = api.normalizarItem({
        id: 42,
        nome: "Pizza",
        preco: "25.50",
        quantidade: 200,
        observacao: "  sem cebola  ",
        adicionais: [{ id: 7, nome: "Queijo", preco: "3.50" }],
    });

    assert.equal(item.id, "42");
    assert.equal(item.preco, 25.5);
    assert.equal(item.quantidade, 99);
    assert.equal(item.observacao, "sem cebola");
    assert.deepEqual(item.adicionais, [{ id: "7", nome: "Queijo", preco: 3.5 }]);
    assert.ok(item.chave.includes("42|sem-variante"));
});

test("calcula o total com adicionais e quantidade", () => {
    const { api } = carregarModulo();
    const item = api.normalizarItem({
        id: "pizza-1",
        nome: "Pizza",
        preco: 20,
        quantidade: 2,
        adicionais: [{ id: "borda", nome: "Borda", preco: 5 }],
    });

    assert.equal(api.totalItem(item), 50);
    assert.equal(api.total([item]), 50);
});

test("preserva a meta do restaurante e sinaliza inicialização", () => {
    const meta = { empresa_id: "empresa-1", empresa_nome: "Pizzaria" };
    const { api, eventos } = carregarModulo({ dadosMeta: meta });
    assert.deepEqual(api.meta(), meta);
    assert.ok(eventos.includes("carrinho-unificado-pronto"));
});
