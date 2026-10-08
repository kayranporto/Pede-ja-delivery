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

test("páginas do cliente carregam o tema alinhado à identidade da Home", () => {
    const loader = read("js/core/site-enhancements.js");
    const theme = read("css/pages/customer-experience.css");
    for (const page of [
        "acompanhamento.html",
        "cadastro.html",
        "checkout.html",
        "dados.html",
        "enderecos.html",
        "favoritos.html",
        "login.html",
        "meus-pedidos.html",
        "nova-senha.html",
        "pedido-sucesso.html",
        "perfil.html",
        "privacidade.html",
        "recuperar-senha.html",
        "restaurante.html",
        "suporte.html",
    ]) {
        assert.match(loader, new RegExp(`"${page.replace(".", "\\.")}"`));
    }
    assert.match(loader, /pj-customer-page/);
    assert.match(loader, /customer-experience\.css/);
    assert.match(read("sw.js"), /customer-experience\.css\?v=1\.0\.5/);
    assert.match(theme, /--primary:\s*#e51b2a/);
    assert.match(theme, /--secondary:\s*#ffc400/);
    assert.match(theme, /\.pj-customer-page :is\(\.page-header, \.orders-header, \.support-header/);
    assert.doesNotMatch(loader, /empresa-dashboard\.html[\s\S]{0,80}customer-experience/);
});

test("área do restaurante recebe identidade própria alinhada à Home", () => {
    const loader = read("js/core/site-enhancements.js");
    const theme = read("css/pages/partner-experience.css");
    for (const page of ["empresa-login.html", "empresa-cadastro.html", "empresa-dashboard.html"]) {
        assert.match(loader, new RegExp(`"${page.replace(".", "\\.")}"`));
    }
    for (const file of ["html/empresa-login.html", "html/empresa-cadastro.html"]) {
        const html = read(file);
        assert.match(html, /Pede Já <small>PARA RESTAURANTES<\/small>/);
        assert.doesNotMatch(html, /Delivery para Restaurantes|Faça parte do Delivery/);
    }
    assert.match(read("html/empresa-dashboard.html"), /dashboard-brand-logo/);
    assert.match(loader, /partner-experience\.css/);
    assert.match(read("sw.js"), /partner-experience\.css\?v=1\.0\.0/);
    assert.match(theme, /#ffc400/);
    assert.match(theme, /\.pj-partner-page \.dashboard-sidebar/);
    assert.match(theme, /\.pj-partner-page \.overview-hero/);
    assert.match(theme, /\.pj-partner-page \.metric-card:hover/);
    assert.match(theme, /\.pj-partner-page \.dashboard-toolbar/);
    assert.match(theme, /@media \(max-width: 620px\)[\s\S]*?\.pj-partner-page \.overview-hero/);
});

test("checkout alinha etapas, marca e totais pendentes sem alterar o fluxo", () => {
    const theme = read("css/pages/customer-experience.css");
    const html = read("html/checkout.html");
    assert.match(read("js/core/site-enhancements.js"), /pj-checkout-page/);
    assert.match(theme, /\.pj-checkout-page \.checkout-brand img\s*\{[^}]*height: 62px !important;[^}]*object-fit: contain !important;/);
    assert.match(theme, /\.pj-checkout-page \.checkout-progress\s*\{[^}]*top: 80px !important;/);
    assert.match(theme, /\.pj-checkout-page \.checkout-summary \.linha\.total strong\s*\{[^}]*display: inline-flex !important;[^}]*gap: 0 6px !important;/);
    assert.match(theme, /\.pj-checkout-page #footerTotal\[data-pendente="true"\]::after\s*\{[^}]*margin-left: 5px !important;/);
    assert.match(theme, /@media \(max-width: 760px\)[\s\S]*?\.pj-checkout-page \.checkout-header-inner\s*\{[^}]*min-height: 68px !important;/);
    assert.match(html, /id="finalizarPedido"/);
    assert.match(html, /id="alterarEndereco"/);
});

test("histórico de pedidos alinha destaque e filtros à identidade Pede Já", () => {
    const theme = read("css/pages/customer-experience.css");
    const loader = read("js/core/site-enhancements.js");
    const html = read("html/meus-pedidos.html");
    assert.match(html, /<title>Meus pedidos \| Pede Já<\/title>/);
    assert.match(loader, /pj-orders-page/);
    assert.match(theme, /\.pj-orders-page \.orders-intro\s*\{[^}]*background: linear-gradient\(120deg, #fff 0%, #fff 56%, #fff4f2 100%\);/);
    assert.match(theme, /\.pj-orders-page \.order-filters button\.active\s*\{[^}]*background: var\(--primary\);/);
    assert.match(theme, /\.pj-orders-page \.order-card:hover,[\s\S]*?\.pj-orders-page \.order-card:focus-within/);
    assert.match(theme, /@media \(max-width: 720px\)[\s\S]*?\.pj-orders-page \.orders-main/);
    assert.match(html, /data-filtro="andamento"/);
    assert.match(html, /id="listaPedidos"/);
});

test("acompanhamento aplica acabamento Pede Já sem remover estados ou ações", () => {
    const theme = read("css/pages/customer-experience.css");
    const loader = read("js/core/site-enhancements.js");
    const html = read("html/acompanhamento.html");
    const tracking = read("css/pages/acompanhamento.css");
    assert.match(html, /<title>Acompanhar pedido \| Pede Já<\/title>/);
    assert.match(loader, /pj-track-page/);
    assert.match(theme, /\.pj-track-page \.track-hero\s*\{[^}]*background: linear-gradient\(120deg, #fff 0%, #fff 62%, #fff3f2 100%\);/);
    assert.match(theme, /\.pj-track-page \.timeline li\.active > span/);
    assert.match(theme, /\.pj-track-page \.receipt-total strong/);
    assert.match(theme, /@media \(max-width: 720px\)[\s\S]*?\.pj-track-page \.track-main/);
    assert.match(html, /id="timeline"/);
    assert.match(html, /id="mensagemForm"/);
    assert.match(html, /id="avaliacaoForm"/);
    assert.match(tracking, /@media print/);
});

test("confirmação exibe somente sucesso e leva ao acompanhamento do pedido criado", () => {
    const theme = read("css/pages/pedido-sucesso.css");
    const html = read("html/pedido-sucesso.html");
    const javascript = read("js/pages/pedido-sucesso.js");
    assert.match(html, /<h1 id="confirmationTitle">Pedido confirmado!<\/h1>/);
    assert.match(html, /id="acompanharPedido" href="acompanhamento\.html"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<a\b/g) || []).length, 1);
    for (const removed of ["success-header", "success-meta", "success-grid", "success-footer", "success-bottom-nav", "numeroPedido", "timelinePedido"]) {
        assert.doesNotMatch(html, new RegExp(removed));
    }
    assert.match(javascript, /App\?\.lerJSON\?\.\("pedidoAtual", null\)/);
    assert.match(javascript, /acompanhamento\.html\?id=\$\{encodeURIComponent\(String\(id\)\)\}/);
    assert.match(theme, /\.success-confirmation-card\s*\{/);
    assert.match(theme, /\.success-confirmation-button:focus-visible/);
    assert.match(read("css/pages/customer-experience.css"), /\.pedido-sucesso-page \.pwa-update,[\s\S]*?display: none !important;/);
    assert.match(html, /<main class="success-confirmation" id="conteudoPrincipal">/);
});

test("modo escuro e controles de tema não fazem parte da aplicação", () => {
    const js = read("js/core/site-enhancements.js");
    const monitoring = read("js/core/monitoring.js");
    const perfil = read("html/perfil.html");
    assert.doesNotMatch(js, /theme-toggle|modo escuro|prefers-color-scheme|multi-delivery-theme/);
    assert.doesNotMatch(monitoring, /theme-toggle|data-theme-preferences|prefers-color-scheme|multi-delivery-theme/);
    assert.doesNotMatch(perfil, /data-theme-preferences|theme-toggle/);
});
