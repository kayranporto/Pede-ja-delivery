"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Home usa horário real no filtro Aberto agora", () => {
    const home = read("js/pages/home.js");
    assert.match(home, /rpc\("empresa_disponibilidade"/);
    assert.match(home, /abertaAgora:\s*data\?\.aberto\s*===\s*true/);
    assert.match(home, /!filtros\.abertoAgora\s*\|\|\s*empresa\.abertaAgora\s*===\s*true/);
    assert.match(read("index.html"), /js\/pages\/home\.js\?v=4\.4\.6/);
    assert.match(read("sw.js"), /js\/pages\/home\.js\?v=4\.4\.6/);
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
    assert.equal((html.match(/data-admin-view/g) || []).length, 8);
    assert.match(html, /id="overview"[^>]*data-admin-view/);
    assert.match(html, /id="pedidos"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="restaurantes"[^>]*data-admin-view[^>]*hidden/);
    assert.match(html, /id="relatorios"[^>]*data-admin-view[^>]*hidden/);
    assert.match(js, /function configurarNavegacao/);
    assert.match(js, /mostrarSecaoAdmin/);
    assert.match(js, /history\.pushState/);
    assert.match(js, /addEventListener\("hashchange"/);
    assert.match(css, /\.admin-view\[hidden\]\s*\{\s*display:\s*none\s*!important\s*\}/);
});


