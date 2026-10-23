"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => {
    const direct = path.join(root, file);
    return fs.readFileSync(fs.existsSync(direct) ? direct : path.join(root, "html", file), "utf8");
};

test("link de recuperação usa o destino GitHub Pages autorizado no Supabase Auth", () => {
    const script = read("js/pages/recuperar-senha.js");
    const html = read("recuperar-senha.html");
    const authConfig = read("supabase/config.toml");
    const applyScript = read("scripts/configurar-auth-github-pages.js");
    const siteUrl = "https://kayranporto.github.io/Pede-ja-delivery/";
    const destino = `${siteUrl}html/nova-senha.html`;

    assert.ok(script.includes(`const URL_RECUPERACAO_SENHA = "${destino}";`));
    assert.ok(script.includes("const options = { redirectTo: URL_RECUPERACAO_SENHA };"));
    assert.ok(authConfig.includes(`site_url = "${siteUrl}"`));
    assert.ok(authConfig.includes(`additional_redirect_urls = ["${destino}"]`));
    assert.match(html, /js\\/pages\\/recuperar-senha\\.js\\?v=4\\.4\\.11/);
    assert.ok(applyScript.includes("uri_allow_list"));
    assert.ok(applyScript.includes("site_url"));
    assert.match(applyScript, /request\("PATCH", patch\)/);
    assert.match(applyScript, /const after = await request\("GET"\)/);
    assert.doesNotMatch(script, /new URL\(["']nova-senha\.html["']/);
});
