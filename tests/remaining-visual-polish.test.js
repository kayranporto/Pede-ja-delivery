"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sharedCss = () => `${read("css/core/enhancements.css")}\n${read("css/modules/mobile-pwa-4.2.6.css")}`;
const hasFocusVisible = (css) => [
    /input,select,textarea\):focus-visible/,
    /input:focus-visible/,
    /select:focus-visible/,
    /textarea:focus-visible/
].some((pattern) => pattern.test(css));

test("acabamento compartilhado cobre foco, toque e carregamento", () => {
    const css = sharedCss();
    assert.ok(hasFocusVisible(css), "faltou foco visível para campos");
    assert.match(css, /@media\(pointer:coarse\)/);
    assert.match(css, /appLoadingSweep|ds-skeleton/);
});

test("fluxo do cliente recebeu refinamentos nas telas principais", () => {
    assert.match(read("css/pages/restaurante.css"), /Cardapio mais claro/);
    assert.match(read("css/pages/checkout.css"), /Checkout com estados/);
    assert.match(read("css/pages/meus-pedidos.css"), /Historico de pedidos/);
    assert.match(read("css/pages/acompanhamento.css"), /Acompanhamento mais legivel/);
});

test("autenticacao e painel do restaurante possuem alvos moveis maiores", () => {
    const css = sharedCss();
    assert.match(read("css/core/auth.css"), /\.auth-button\{min-height:52px\}|min-height:\s*55px/);
    assert.match(read("css/pages/empresa-dashboard.css"), /Painel operacional com leitura/);
    assert.match(css, /@media\(pointer:coarse\)[\s\S]*min-height:44px/);
});

test("convites PWA nao disputam espaco sobre as acoes no celular", () => {
    assert.match(read("js/core/site-enhancements.js"), /install\.textContent="Instalar app"/);
    assert.match(read("css/modules/mobile-pwa-4.2.6.css"), /\.pwa-update\.show~\.install-app\{display:none!important\}/);
});

test("checkout mobile não bloqueia controles globais com botão final desabilitado", () => {
    const css = read("css/modules/mobile-pwa-4.2.6.css");
    assert.match(css, /#finalizarPedido:disabled\{pointer-events:none!important\}/);
    assert.match(css, /\.checkout-footer\{pointer-events:none\}/);
});

test("páginas críticas carregam a camada visual compartilhada", () => {
    for (const file of ["index.html", "html/restaurante.html", "html/empresa-equipe.html", "html/empresa-colaborador.html"]) {
        const html = read(file);
        assert.match(html, /css\/core\/enhancements\.css/);
        assert.match(html, /js\/core\/site-enhancements\.js/);
    }
});

test("todas as paginas carregam a camada visual compartilhada", () => {
    const htmlFiles = ["index.html", "offline.html", "404.html", ...fs.readdirSync(path.join(root, "html")).filter((file) => file.endsWith(".html")).map((file) => `html/${file}`)];
    for (const file of htmlFiles) {
        assert.match(read(file), /css\/core\/enhancements\.css/, `${file} sem enhancements.css`);
        assert.match(read(file), /js\/core\/site-enhancements\.js/, `${file} sem site-enhancements.js`);
    }
});

test("modo claro é o único tema disponível", () => {
    const js = read("js/core/monitoring.js");
    assert.match(js, /multi-delivery-theme/);
    assert.match(js, /localStorage\.setItem\(THEME_STORAGE_KEY, "light"\)/);
    assert.match(js, /data-theme = "light"/);
    assert.match(js, /\.theme-toggle,\[data-theme-preferences\]/);
});
