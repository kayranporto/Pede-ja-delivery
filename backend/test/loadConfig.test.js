"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const loadConfig = require("../src/Infrastructure/config/loadConfig");

test("loadConfig usa chave pública e interpreta origens permitidas", () => {
    const config = loadConfig({
        SUPABASE_URL: "https://example.supabase.co/",
        SUPABASE_PUBLISHABLE_KEY: "public-key",
        SUPABASE_ANON_KEY: "fallback-key",
        PORT: "4100",
        ALLOWED_ORIGINS: "https://site.example, http://localhost:5500 ",
    });

    assert.equal(config.supabaseUrl, "https://example.supabase.co");
    assert.equal(config.publishableKey, "public-key");
    assert.equal(config.port, 4100);
    assert.deepEqual(config.allowedOrigins, ["https://site.example", "http://localhost:5500"]);
});

test("loadConfig aceita a chave anon legada e valida configuração obrigatória", () => {
    const config = loadConfig({
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_ANON_KEY: "anon-key",
    });

    assert.equal(config.publishableKey, "anon-key");
    assert.throws(() => loadConfig({}), /SUPABASE_URL/);
    assert.throws(() => loadConfig({
        SUPABASE_URL: "javascript:alert(1)",
        SUPABASE_PUBLISHABLE_KEY: "public-key",
    }), /HTTP\(S\)/);
    assert.throws(() => loadConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "public-key",
        PORT: "70000",
    }), /PORT/);
    const serviceRoleKey = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
    assert.throws(() => loadConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: serviceRoleKey,
    }), /não aceita chaves service_role/);
    assert.throws(() => loadConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_private-key",
    }), /não aceita chaves service_role/);
});
