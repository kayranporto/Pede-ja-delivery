"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Endereço é cadastrado pela página Meus endereços e apenas selecionado no checkout", () => {
    const home = read("index.html");
    const checkout = read("html/checkout.html");
    assert.match(home, /id="seletorEndereco"/);
    assert.match(home, /id="heroBuscarRestaurantes" type="button" aria-label="Explorar restaurantes">⌕/);
    assert.match(home, /href="html\/enderecos\.html\?redirect=\.\.\/index\.html"/);
    assert.match(home, /Digite seu endereço/);
    assert.match(read("js/pages/home.js"), /window\.location\.href = "html\/enderecos\.html\?redirect=\.\.\/index\.html"/);
    assert.match(checkout, /id="alterarEndereco"/);
    assert.doesNotMatch(checkout, /id="(?:cep|logradouro|numero)"/);
    assert.match(read("html/enderecos.html"), /id="enderecoForm"/);
});

test("Destaque da home mantém conteúdo e CTA utilizáveis em telas pequenas", () => {
    const home = read("index.html");
    const polish = read("css/pages/home-polish-4.5.1.css");
    const reference = read("css/pages/home-final-reference.css");
    assert.match(home, /<main id="conteudoPrincipal">/);
    assert.match(home, /id="heroTitulo">Sua comida favorita, <span>sem sair de casa!<\/span><\/h1>/);
    assert.match(home, /home-final-reference\.css\?v=3\.4\.2/);
    assert.match(home, /href="assets\/home-banner-reference\.png" as="image" fetchpriority="high"\/>/);
    assert.match(home, /class="hero-reference-art" aria-hidden="true"><img src="assets\/home-banner-reference\.png"/);
    assert.match(polish, /@media\s*\(max-width:\s*680px\)/);
    assert.match(polish, /\.hero-reference-copy > :not\(\.hero-reference-searchbar\)/);
    assert.match(polish, /\.market-hero\s*\{\s*height:\s*auto !important;\s*min-height:\s*0 !important;/);
    assert.match(polish, /\.categorias\s*\{\s*position:\s*relative !important;\s*z-index:\s*8 !important;\s*margin-top:\s*-36px !important;/);
    assert.match(polish, /\.hero-reference-benefits span\s*\{\s*min-height:\s*16px !important;\s*line-height:\s*1\.3 !important;/);
    assert.match(polish, /@media \(min-width: 1001px\)\s*\{[\s\S]*?#heroTitulo\s*\{\s*max-width:\s*700px !important;\s*font-size:\s*clamp\(40px, 3\.7vw, 54px\) !important;/);
    assert.match(reference, /grid-template-areas:\s*"logo search menu"/);
    assert.match(reference, /\.home-page \.account-nav,[\s\S]{0,100}\.home-page \.cart\{display:none!important\}/);
    assert.match(reference, /\.hero-reference-copy > :not\(\.hero-reference-searchbar\)\{[^}]*clip-path:none!important;/);
    assert.match(reference, /\.hero-reference-searchbar\{[^}]*position:relative!important;/);
    assert.match(reference, /\.hero-reference-art\{[^}]*background-image:\s*$/m);
    assert.match(reference, /url\("\.\.\/\.\.\/assets\/home-banner-reference\.png"\)!important;/);
    assert.match(reference, /@media\(max-width:680px\)\{[\s\S]*?\.home-page \.hero-reference-frame\{[^}]*min-height:clamp\(390px,105vw,430px\)!important;[^}]*url\("\.\.\/\.\.\/assets\/home-banner-reference\.png"\) center 48% \/ cover no-repeat!important;/);
    assert.match(reference, /\.home-page \.hero-reference-frame\{[^}]*background:[\s\S]*?rgba\(18,12,8,\.2\)[\s\S]*?url\("\.\.\/\.\.\/assets\/home-banner-reference\.png"\) center 48% \/ cover no-repeat!important;/);
    assert.match(reference, /\.home-page \.hero-reference-art\{[^}]*display:none!important;/);
    assert.match(reference, /\.home-page \.hero-reference-copy\{[^}]*position:absolute!important;[^}]*height:100%!important;[^}]*background:transparent!important;/);
    assert.match(reference, /\.home-page #heroTitulo\{[^}]*color:#fff!important;[^}]*text-shadow:0 2px 12px rgba\(0,0,0,\.72\)!important;/);
    assert.match(reference, /\.hero-reference-art img\{display:none!important\}/);
    assert.match(reference, /@media\(min-width:681px\)\{\s*\.home-page \.market-hero\{[^}]*padding:clamp\(16px,2vw,28px\) clamp\(18px,3vw,42px\) 14px!important;/);
    assert.match(reference, /\.home-page \.hero-reference-frame\{[^}]*border-radius:30px!important;[^}]*box-shadow:0 22px 52px rgba\(20,24,32,\.16\)!important;/s);
});

test("Home usa horário real no filtro Aberto agora", () => {
    const home = read("js/pages/home.js");
    assert.match(home, /DeliveryAPI\.disponibilidade\(/);
    assert.match(home, /abertaAgora:\s*data\?\.aberto\s*===\s*true/);
    assert.match(home, /!filtros\.abertoAgora\s*\|\|\s*empresa\.abertaAgora\s*===\s*true/);
    assert.match(read("index.html"), /js\/pages\/home\.js\?v=4\.5\.0/);
    assert.match(read("sw.js"), /js\/pages\/home\.js\?v=4\.5\.0/);
});

test("robots bloqueia as rotas privadas reais em html", () => {
    const robots = read("robots.txt");
    for (const rota of [
        "/html/admin.html",
        "/html/checkout.html",
        "/html/dados.html",
        "/html/entregador.html",
        "/html/empresa-dashboard.html",
        "/html/empresa-colaborador.html",
        "/html/empresa-equipe.html",
        "/html/enderecos.html",
        "/html/favoritos.html",
        "/html/meus-pedidos.html",
        "/html/perfil.html",
        "/html/acompanhamento.html",
        "/html/pedido-sucesso.html",
        "/html/nova-senha.html"
    ]) {
        assert.match(robots, new RegExp(`^Disallow: ${rota.replaceAll(".", "\\.")}$`, "m"), `${rota} deve ficar fora de indexação`);
    }
});

test("tela de loading do admin é ocultada corretamente após carregar", () => {
    const adminCss = read("css/pages/admin.css");
    assert.match(adminCss, /\.admin-loading\[hidden\]\s*\{\s*display:\s*none\s*!important\s*\}/);
    const accessCss = read("css/core/accessibility.css");
    assert.ok(accessCss.includes("[hidden] {\r\n    display: none !important;\r\n}") || accessCss.includes("[hidden] {\n    display: none !important;\n}"));
    const adminJs = read("js/pages/admin.js");
    assert.match(adminJs, /loadingAdmin\.hidden\s*=\s*true/);
    assert.match(adminJs, /loadingAdmin\.style\.display\s*=\s*["']none["']/);
});

test("painel administrativo exibe apenas a seção escolhida e separa o conteúdo", () => {
    const html = read("html/admin.html");
    const js = read("js/pages/admin.js");
    const css = read("css/pages/admin.css");
    assert.equal((html.match(/data-admin-view/g) || []).length, 12);
    const planosJs = read("js/modules/admin-planos-4.3.js");
    assert.match(planosJs, /className = "admin-section admin-view"/);
    assert.match(planosJs, /dataset\.adminView = ""/);
    assert.match(planosJs, /section\.hidden = location\.hash !== "#planos"/);
    assert.match(js, /planos: "Planos e assinaturas"/);
    assert.match(js, /secao === "planos"/);
    assert.match(html, /id="overview"[^>]*data-admin-view/);
    assert.match(html, /id="pedidos"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="restaurantes"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="relatorios"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="financeiro"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="entregas"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="areas"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="marketing"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="novaRegiaoAdmin"/);
    assert.match(html, /id="novaCampanhaMarketing"/);
    assert.match(html, /id="adminAlertSummaryCount"/);
    assert.match(html, /id="adminPermissionChips"/);
    assert.match(js, /function renderizarResumoAdmin/);
    assert.match(js, /abrirResumoAlertasAdmin/);
    assert.match(js, /function renderizarRegioesAdmin/);
    assert.match(js, /function renderizarMarketingAdmin/);
    assert.match(js, /function configurarNavegacao/);
    assert.match(js, /function abrirEditorPermissoesAdmin/);
    assert.match(js, /function temPermissaoAdmin/);
    assert.match(js, /salvar_permissoes/);
    assert.match(js, /adminPermissoes/);
    assert.match(html, /id="painelAdministradoresAdmin"/);
    assert.match(js, /mostrarSecaoAdmin/);
    assert.match(js, /const links = \[\.\.\.document\.querySelectorAll\("\.admin-sidebar nav a\[href\^='#'\]"\)\]/);
    assert.match(js, /window\.\__ADMIN_MOSTRAR_SECAO__ = mostrarSecaoAdmin/);
    assert.match(js, /window\.\__ADMIN_PODE_ACESSAR_SECAO__ = podeAcessarSecaoAdmin/);
    assert.match(js, /history\.pushState/);
    assert.match(js, /addEventListener\("hashchange"/);
    assert.match(css, /\.admin-view\[hidden\]\s*\{\s*display:\s*none\s*!important\s*\}/);
});
