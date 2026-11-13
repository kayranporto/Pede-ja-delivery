"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "js/modules/pos-pedido.js"), "utf8");

function carregarModulo() {
    const armazenamento = new Map();
    const location = { href: "" };
    const deliveryApi = { cardapio: async () => menu };
    const empresa = { id: "restaurante-1", nome: "Restaurante de teste", status: true };
    const menu = {
        restaurante: empresa,
        produtos: [{
            id: "produto-1",
            nome: "Lanche",
            preco: 25,
            disponivel: true,
            grupos_adicionais: [],
            variantes: []
        }],
        grupos_adicionais: []
    };
    const context = {
        window: { AppConfirm: null, AppToast() {}, DeliveryAPI: deliveryApi },
        App: {
            lerJSON: () => [],
            salvarJSON: (chave, valor) => armazenamento.set(chave, valor),
            mensagemErro: () => "Erro"
        },
        DeliveryAPI: deliveryApi,
        location,
        localStorage: { setItem: (chave, valor) => armazenamento.set(chave, valor) },
        sessionStorage: { setItem: (chave, valor) => armazenamento.set(chave, valor) },
        setTimeout(callback) { callback(); },
        console: { error() {} }
    };
    vm.runInNewContext(source, context);
    return { pedirNovamente: context.window.PosPedido.pedirNovamente, location };
}

const pedido = {
    empresa_id: "restaurante-1",
    pedido_itens: [{ produto_id: "produto-1", quantidade: 1 }]
};

test("home oferece a seção de pedido anterior e carrega o fluxo de repetição", () => {
    assert.match(html, /id="pedidoAnteriorSection"[^>]+hidden/);
    assert.match(html, /id="pedidoAnteriorCard"[^>]+aria-live="polite"/);
    assert.match(html, /href="html\/meus-pedidos\.html">Ver meus pedidos/);
    assert.match(html, /js\/modules\/pos-pedido\.js\?v=4\.2\.1/);
});

test("repetir pedido na home direciona para o checkout dentro de html/", async () => {
    const modulo = carregarModulo();
    await modulo.pedirNovamente(pedido, null, { prefixoRotas: "html/" });
    assert.equal(modulo.location.href, "html/checkout.html");
});

test("repetir pedido na página de pedidos mantém o caminho relativo existente", async () => {
    const modulo = carregarModulo();
    await modulo.pedirNovamente(pedido, null);
    assert.equal(modulo.location.href, "checkout.html");
});
