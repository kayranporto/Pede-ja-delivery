"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => {
    const direct = path.join(root, file);
    return fs.readFileSync(fs.existsSync(direct) ? direct : path.join(root, "html", file), "utf8");
};

test("link de recuperação usa os destinos Vercel e GitHub Pages autorizados no Supabase Auth", () => {
    const script = read("js/pages/recuperar-senha.js");
    const html = read("recuperar-senha.html");
    const authConfig = read("supabase/config.toml");
    const applyScript = read("scripts/configurar-auth-github-pages.js");
    const siteUrl = "https://site-delivery-42.vercel.app/";
    const destinos = [
        `${siteUrl}html/nova-senha.html`,
        "https://kayranporto.github.io/Pede-ja-delivery/html/nova-senha.html"
    ];

    assert.ok(script.includes(`? "${destinos[0]}"`));
    assert.ok(script.includes(`: "${destinos[1]}";`));
    assert.ok(script.includes("const options = { redirectTo: URL_RECUPERACAO_SENHA };"));
    assert.ok(authConfig.includes(`site_url = "${siteUrl}"`));
    assert.ok(authConfig.includes(`additional_redirect_urls = ["${destinos.join('", "')}"`));
    assert.match(html, /recuperar-senha\.js\?v=4\.4\.12/);
    assert.ok(applyScript.includes("uri_allow_list"));
    assert.ok(applyScript.includes(`const siteUrl = "${siteUrl}";`));
    assert.ok(applyScript.includes(`"${destinos[1]}"`));
    assert.match(applyScript, /request\("PATCH", patch\)/);
    assert.match(applyScript, /const after = await request\("GET"\)/);
    assert.doesNotMatch(script, /new URL\(["']nova-senha\.html["']/);
});

test("callback de recuperação recebido na home abre a página de nova senha", () => {
    const index = read("index.html");
    const router = read("js/core/password-recovery-redirect.js");
    assert.match(index, /js\/core\/password-recovery-redirect\.js\?v=1\.0\.0/);

    let destino;
    const window = {
        location: {
            href: "https://kayranporto.github.io/Pede-ja-delivery/?type=recovery&code=abc",
            search: "?type=recovery&code=abc",
            hash: "",
            replace: (url) => { destino = url; }
        }
    };

    vm.runInNewContext(router, { URL, URLSearchParams, window });
    assert.equal(
        destino,
        "https://kayranporto.github.io/Pede-ja-delivery/html/nova-senha.html?type=recovery&code=abc"
    );
});

test("erro de link de recuperação expirado na home abre a página de recuperação", () => {
    const router = read("js/core/password-recovery-redirect.js");
    let destino;
    const window = {
        location: {
            href: "http://127.0.0.1:5500/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
            search: "",
            hash: "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
            replace: (url) => { destino = url; }
        }
    };

    vm.runInNewContext(router, { URL, URLSearchParams, window });
    assert.equal(
        destino,
        "http://127.0.0.1:5500/html/nova-senha.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );
});

test("nova senha oferece salvar e solicitar outro código", () => {
    const html = read("nova-senha.html");
    const script = read("js/pages/nova-senha.js");
    assert.match(html, /id="novaSenhaForm"[^>]*hidden/);
    assert.match(html, /class="btn" type="submit">Salvar nova senha<\/button>/);
    assert.match(html, /id="novoLinkRecuperacao" class="btn secundario" href="recuperar-senha\.html">Pedir novo código por e-mail<\/a>/);
    assert.match(script, /db\.auth\.updateUser\(\{ password: senha \}\)/);
});

test("callback PKCE redireciona após validar o código sem reutilizá-lo", () => {
    const router = read("js/core/password-recovery-redirect.js");
    let destino;
    let observarAuth;
    const window = {
        location: {
            href: "https://kayranporto.github.io/Pede-ja-delivery/?code=abc&state=xyz",
            search: "?code=abc&state=xyz",
            hash: "",
            replace: (url) => { destino = url; }
        },
        db: {
            auth: {
                onAuthStateChange: (listener) => {
                    observarAuth = listener;
                    return { data: { subscription: { unsubscribe() {} } } };
                }
            }
        },
        addEventListener() {}
    };

    vm.runInNewContext(router, { URL, URLSearchParams, window });
    observarAuth("PASSWORD_RECOVERY");
    assert.equal(
        destino,
        "https://kayranporto.github.io/Pede-ja-delivery/html/nova-senha.html?state=xyz"
    );
});
