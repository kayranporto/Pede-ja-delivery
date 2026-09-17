"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sharedCss = () => `${read("css/core/enhancements.css")}\n${read("css/modules/mobile-pwa-4.2.6.css")}`;

const hasDarkThemeSelector = (css) => /html\[data-theme\s*=\s*["']?dark["']?\]/.test(css);
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

test("modo escuro global respeita o sistema e salva a escolha", () => {
    const css = sharedCss();
    const js = read("js/core/site-enhancements.js");
    assert.ok(hasDarkThemeSelector(css), "faltou seletor raiz do tema escuro");
    assert.match(css, /\.theme-toggle/);
    assert.match(css, /data-theme[^\n]*dark/);
    assert.match(css, /hero-deal-card|produto-card/);
    assert.match(js, /prefers-color-scheme:\s*dark/);
    assert.match(js, /multi-delivery-theme/);
    assert.match(js, /localStorage\.setItem\(THEME_STORAGE_KEY/);
    assert.match(js, /aria-pressed/);
});

test("modo escuro cobre superfícies operacionais e conteúdo dinâmico", () => {
    const css = sharedCss();
    assert.ok(hasDarkThemeSelector(css), "tema escuro não está definido nas camadas compartilhadas");
    for (const seletor of [
        ".checkout-card",
        ".order-card",
        ".admin-card",
        ".produto-card",
        ".payment-option",
        ".modal-content"
    ]) assert.ok(css.includes(seletor), `faltou referência a ${seletor}`);
});

test("tema escuro mantém os textos críticos com contraste explícito", () => {
    const css = read("css/modules/mobile-pwa-4.2.6.css");
    for (const seletor of [
        ".auth-field label",
        ".auth-check",
        ".auth-role-switch a.active",
        "#infoEntrega",
        ".produto-card .produto-info strong",
        "#enderecoEntrega",
        "#pagamentoNota",
        "#enderecoStatus"
    ]) assert.ok(css.includes(seletor), `faltou correção de contraste para ${seletor}`);
});

test("checkout mobile não bloqueia controles globais com botão final desabilitado", () => {
    const css = read("css/modules/mobile-pwa-4.2.6.css");
    assert.match(css, /#finalizarPedido:disabled\{pointer-events:none!important\}/);
    assert.match(css, /\.checkout-footer\{pointer-events:none\}/);
});

test("páginas críticas carregam a camada de tema compartilhada", () => {
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
