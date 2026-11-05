"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("login oferece acesso de cliente, restaurante e entregador", () => {
    const login = read("html/login.html");
    const empresa = read("html/empresa-login.html");
    for (const html of [login, empresa]) {
        assert.match(html, /auth-role-switch--three/);
        assert.match(html, /href="entregador\.html">🛵 Entregador/);
    }
});

test("perfil oferece entrada para o painel do entregador", () => {
    const perfil = read("html/perfil.html");
    assert.match(perfil, /class="menu-item entregador-menu-item" href="entregador\.html"/);
});

test("painel do entregador preserva o retorno ao login para usuário não autenticado", () => {
    const entregador = read("js/pages/entregador.js");
    assert.match(entregador, /if \(!user\) \{ localStorage\.setItem\("redirect", "entregador\.html"\); location\.replace\("login\.html"\); return; \}/);
});
