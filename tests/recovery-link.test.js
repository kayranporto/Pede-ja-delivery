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

test("link de recuperação usa o destino exato autorizado no Supabase Auth", () => {
    const script = read("js/pages/recuperar-senha.js");
    const html = read("recuperar-senha.html");
    const authConfig = read("supabase/config.toml");
    const destino = "https://site-delivery-42.vercel.app/html/nova-senha.html";

    assert.ok(script.includes(`const URL_RECUPERACAO_SENHA = "${destino}";`));
    assert.ok(script.includes("const options = { redirectTo: URL_RECUPERACAO_SENHA };"));
    assert.ok(authConfig.includes(`additional_redirect_urls = ["${destino}"]`));
    assert.match(html, /js\/pages\/recuperar-senha\.js\?v=4\.4\.10/);
    assert.doesNotMatch(script, /new URL\(["']nova-senha\.html["']/);
});
