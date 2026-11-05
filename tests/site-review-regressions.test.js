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
    const homeJs = read("js/pages/home.js");
    assert.match(homeJs, /function editarEndereco\(\)\s*\{\s*window\.location\.href = "html\/enderecos\.html\?redirect=\.\.\/index\.html";\s*\}/);
    assert.match(homeJs, /locationBox\.addEventListener\("click", editarEndereco\)/);
    assert.match(checkout, /id="alterarEndereco"/);
    assert.doesNotMatch(checkout, /id="(?:cep|logradouro|numero)"/);
    assert.match(read("html/enderecos.html"), /id="enderecoForm"/);
});

test("Home mantém o catálogo sem banner e preserva os controles responsivos", () => {
    const home = read("index.html");
    const visual = read("css/pages/home-visual-refresh.css");

    assert.match(home, /class="home-page"/);
    assert.doesNotMatch(home, /class="market-hero"|class="hero-reference-frame"|id="heroTitulo"|id="heroBuscarRestaurantes"/);
    assert.match(home, /class="categorias market-section"/);
    assert.match(home, /id="campoBusca"/);
    assert.match(home, /id="restaurantesTitulo"/);
    assert.match(home, /id="listaRestaurantes"/);
    assert.match(home, /id="listaProdutos"/);
    assert.match(home, /home-visual-refresh\.css\?v=1\.0\.0/);
    assert.match(visual, /\.home-page \.market-hero \{ display: none !important; \}/);
    assert.match(visual, /@media \(max-width: 680px\)/);
    assert.match(visual, /grid-template-columns: repeat\(2, minmax\(0,1fr\)\) !important/);
});
 
test("Home usa horário real no filtro Aberto agora", () => {
    const home = read("js/pages/home.js");
    assert.match(home, /DeliveryAPI\.disponibilidade\(/);
    assert.match(home, /abertaAgora:\s*data\?\.aberto\s*===\s*true/);
    assert.match(home, /!filtros\.abertoAgora\s*\|\|\s*empresa\.abertaAgora\s*===\s*true/);
    assert.match(read("index.html"), /js\/pages\/home\.js\?v=4\.5\.\d+/);
    assert.match(read("sw.js"), /js\/pages\/home\.js\?v=4\.5\.\d+/);
});


test("Home exibe o banner cadastrado de cada restaurante no cartão", () => {
    const home = read("js/pages/home.js");
    const api = read("supabase/functions/api-publica/index.ts");
    const sw = read("sw.js");
    assert.match(home, /empresa\.banner/);
    assert.match(home, /criarImagemOpcional\(/);
    assert.doesNotMatch(home, /fotoRealPorTexto|FOTOS_REAIS_HOME|fotoGenerica/);
    assert.match(home, /produto\.imagem/);
    assert.match(api, /"banner"/);
    assert.match(sw, /home-responsive-reference\.css\?v=1\.0\.5/);
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
    assert.equal((html.match(/data-admin-view/g) || []).length, 13);
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


test("filtros da Home são configuráveis por administradores e lidos de uma tabela protegida", () => {
    const html = read("html/admin.html");
    const admin = read("js/pages/admin.js");
    const manager = read("js/modules/admin-categorias-filtros.js");
    const shared = read("js/core/categorias-filtros.js");
    const migration = read("supabase/migrations/20261022232000_admin_categorias_filtros.sql");
    assert.match(html, /id="categorias_filtros"[^>]*data-admin-view/);
    assert.match(html, /id="filtroCategoriaForm"/);
    assert.match(html, /id="adminCategoriasFiltros"/);
    assert.match(admin, /chave: "categorias_filtros"/);
    assert.match(admin, /inicializarCategoriasFiltrosAdmin/);
    assert.match(manager, /method: atual \? "PATCH" : "POST"/);
    assert.match(manager, /method: "DELETE"/);
    assert.match(manager, /\/v1\/admin\/categorias-filtros/);
    assert.match(shared, /categorias_filtros_home/);
    assert.match(migration, /enable row level security/i);
    assert.match(migration, /for select to anon, authenticated/i);
    assert.match(migration, /usuario_tem_permissao_admin\('categorias_filtros'\)/);
    assert.match(migration, /create unique index/i);
});


test("a versão do README acompanha a versão declarada no package.json", () => {
    const packageJson = JSON.parse(read("package.json"));
    const readme = read("README.md");
    assert.match(readme, new RegExp(`^# PedeJá ${packageJson.version}$`, "m"));
});
