"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("convites administrativos retornam ao painel da origem autorizada", () => {
    const handler = read("supabase/functions/admin-usuarios/index.ts");
    const config = read("supabase/config.toml");
    const setup = read("scripts/configurar-auth-github-pages.js");
    const redirectUrls = [
        "https://site-delivery-42.vercel.app/html/admin.html",
        "https://kayranporto.github.io/Pede-ja-delivery/html/admin.html"
    ];

    assert.ok(handler.includes('"https://site-delivery-42.vercel.app": "https://site-delivery-42.vercel.app/html/admin.html"'));
    assert.ok(handler.includes('"https://kayranporto.github.io": "https://kayranporto.github.io/Pede-ja-delivery/html/admin.html"'));
    assert.match(handler, /inviteUserByEmail\(email,\s*\{\s*redirectTo,/);
    assert.ok(config.includes(redirectUrls.join('", "')));
    assert.match(setup, /const adminInviteRedirectUrls = \[\s*`\$\{siteUrl\}html\/admin\.html`,\s*"https:\/\/kayranporto\.github\.io\/Pede-ja-delivery\/html\/admin\.html"/);
});
