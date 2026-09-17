"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const hasDarkThemeSelector = (css) => /html\[data-theme\s*=\s*["']?dark["']?\]/.test(css);
const hasFocusVisible = (css) => [
    /input,select,textarea\):focus-visible/,
    /input:focus-visible/,
    /select:focus-visible/,
    /textarea:focus-visible/
].some((pattern) => pattern.test(css));

test("acabamento compartilhado cobre foco, toque e carregamento", () => {
    const css = read("css/core/enhancements.css");
    assert.ok(hasFocusVisible(css), "faltou foco visível para campos");
    assert.match(css, /@media\(pointer:coarse\)/);
    assert.match(css, /appLoadingSweep/);
});

test("fluxo do cliente recebeu refinamentos nas telas principais", () => {
    assert.match(read("css/pages/restaurante.css"), /Cardapio mais claro/);
    assert.match(read("css/pages/checkout.css"), /Checkout com estados/);
    assert.match(read("css/pages/meus-pedidos.css"), /Historico de pedidos/);
    assert.match(read("css/pages/acompanhamento.css"), /Acompanhamento mais legivel/);
});

test("autenticacao e painel do restaurante possuem alvos moveis maiores", () => {
    assert.match(read("css/core/auth.css"), /\.auth-button\{min-height:52px\}/);
    assert.match(read("css/pages/empresa-dashboard.css"), /Painel operacional com leitura/);
});

test("convites PWA nao disputam espaco sobre as acoes no celular", () => {
    assert.match(read("js/core/site-enhancements.js"), /install\.textContent="Instalar app"/);
    assert.match(read("css/modules/mobile-pwa-4.2.6.css"), /\.pwa-update\.show~\.install-app\{display:none!important\}/);
});

test("modo escuro global respeita o sistema e salva a escolha", () => {
    const css = read("css/core/enhancements.css");
    const js = read("js/core/site-enhancements.js");
    assert.ok(hasDarkThemeSelector(css), "faltou seletor raiz do tema escuro");
    assert.match(css, /\.theme-toggle/);
    assert.match(css, /data-theme\s*=\s*["']?dark["']?\]\s+\.cupom-box/);
    assert.match(css, /\.hero-deal-card,\.hero-rating-card,\.hero-time-card/);
    assert.match(js, /prefers-color-scheme:\s*dark/);
    assert.match(js, /multi-delivery-theme/);
    assert.match(js, /localStorage\.setItem\(THEME_STORAGE_KEY/);
    assert.match(js, /aria-pressed/);
});

test("modo escuro cobre as superfícies compartilhadas das páginas operacionais", () => {
    const css = read("css/core/enhancements.css");
    assert.ok(hasDarkThemeSelector(css), "tema escuro não está definido no CSS compartilhado");
    assert.match(css, /--surface:#181b21/);
    assert.match(css, /--text:#f4f5f7/);
    for (const seletor of [
        ".checkout-card",
        ".driver-section",
        ".order-filters",
        ".admin-filters",
        ".banner-restaurante",
        ".pending-card"
    ]) assert.ok(css.includes(seletor), `faltou referência a ${seletor}`);
});

test("modo escuro preserva cobertura dos módulos dinâmicos", () => {
    const css = read("css/core/enhancements.css");
    assert.ok(hasDarkThemeSelector(css));
    for (const seletor of [
        "#planos .plans-card",
        ".plan43-hero",
        ".units-card",
        ".public-unit-picker",
        ".driver-earning-card",
        ".foto-editor",
        ".sair,.sair:hover"
    ]) assert.ok(css.includes(seletor), `faltou referência a ${seletor}`);
});

test("módulos do cardápio mantêm uploads e chips utilizáveis no tema escuro", () => {
    const css = read("css/core/enhancements.css");
    const uploader = read("js/core/media-uploader.js");
    assert.match(uploader, /input\[type=file\]/);
    assert.ok(hasDarkThemeSelector(css));
    assert.match(css, /chip-admin/);
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
