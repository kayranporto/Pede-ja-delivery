"use strict";

const { test, expect } = require("@playwright/test");

const apiUrl = String(process.env.API_PUBLICA_URL || "").replace(/\/$/, "");
const apiKey = String(process.env.API_PUBLICA_KEY || "");

test.describe("API pública publicada", () => {
    test.skip(!apiUrl || !apiKey, "Defina API_PUBLICA_URL e API_PUBLICA_KEY para executar o smoke remoto.");

    test("status responde com contrato e cabeçalhos versionados", async ({ request }) => {
        const response = await request.get(`${apiUrl}/v1/status`, { headers: { apikey: apiKey } });
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("application/json");
        expect(response.headers()["x-api-version"]).toBe("1.0.0");
        expect(response.headers()["x-content-type-options"]).toBe("nosniff");

        const body = await response.json();
        expect(body.data).toMatchObject({
            status: "ok",
            servico: "multi-delivery-api",
            versao: "1.0.0"
        });
        expect(body.request_id).toEqual(expect.any(String));
    });

    test("catálogo limita a página e não revela campos administrativos", async ({ request }) => {
        const response = await request.get(`${apiUrl}/v1/restaurantes?limite=1&offset=0`, {
            headers: { apikey: apiKey }
        });
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.data.length).toBeLessThanOrEqual(1);
        expect(body.meta).toMatchObject({ limite: 1, offset: 0 });
        for (const restaurant of body.data) {
            expect(restaurant).not.toHaveProperty("usuario_id");
            expect(restaurant).not.toHaveProperty("cnpj");
            expect(restaurant).not.toHaveProperty("email");
            expect(restaurant).not.toHaveProperty("telefone");
        }
    });

    test("cardápio entrega somente dados públicos relacionados", async ({ request }) => {
        const listResponse = await request.get(`${apiUrl}/v1/restaurantes?limite=1`, {
            headers: { apikey: apiKey }
        });
        expect(listResponse.status()).toBe(200);
        const listBody = await listResponse.json();
        test.skip(!listBody.data.length, "Não há restaurante publicado para validar o cardápio.");

        const restaurantId = listBody.data[0].id;
        const response = await request.get(`${apiUrl}/v1/restaurantes/${encodeURIComponent(restaurantId)}/cardapio`, {
            headers: { apikey: apiKey }
        });
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.data.restaurante.id).toBe(restaurantId);
        expect(body.data.categorias).toEqual(expect.any(Array));
        expect(body.data.produtos).toEqual(expect.any(Array));
        expect(body.data.grupos_adicionais).toEqual(expect.any(Array));

        const serialized = JSON.stringify(body);
        for (const field of ["usuario_id", "cnpj", "email", "telefone"]) {
            expect(serialized).not.toContain(`"${field}"`);
        }
    });
});

const fs = require("node:fs");
const pathModule = require("node:path");

// A chave publishable é pública e é a mesma usada pelo cliente do site.
// Isso permite validar a rota real sem exigir secrets opcionais no GitHub Actions.
const publicClientConfig = fs.readFileSync(pathModule.join(__dirname, "../js/core/supabase.js"), "utf8");
const supabaseUrl = String(process.env.SUPABASE_URL || publicClientConfig.match(/const SUPABASE_URL = "([^"]+)"/)?.[1] || "").replace(/\/$/, "");
const searchApiUrl = String(process.env.API_PUBLICA_URL || `${supabaseUrl}/functions/v1/api-completa`).replace(/\/$/, "");
const searchApiKey = String(process.env.API_PUBLICA_KEY || publicClientConfig.match(/const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1] || "");

test("busca pública de produtos funciona na API publicada", async ({ request }) => {
    expect(searchApiUrl).not.toBe("");
    expect(searchApiKey).toMatch(/^sb_publishable_/);

    const requestId = `e2e-busca-produtos-${Date.now()}`;
    const response = await request.get(
        `${searchApiUrl}/v1/produtos/buscar?busca=pizza&limite=3`,
        {
            headers: {
                apikey: searchApiKey,
                "x-request-id": requestId,
                accept: "application/json"
            },
            timeout: 20000
        }
    );
    const rawBody = await response.text();
    expect(response.status(), rawBody).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["x-api-version"]).toBeTruthy();

    const body = JSON.parse(rawBody);
    expect(body.request_id).toBe(requestId);
    expect(body.data).toEqual(expect.any(Array));
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThanOrEqual(3);

    for (const product of body.data) {
        expect(product.id).toBeTruthy();
        expect(product.empresa_id).toBeTruthy();
        expect(product.nome).toBeTruthy();
        expect(product.empresa.id).toBe(product.empresa_id);
        expect(product.empresa.status).toBe(true);
    }

    const serialized = JSON.stringify(body);
    for (const field of ["usuario_id", "cnpj", "email", "telefone"]) {
        expect(serialized).not.toContain(`"${field}"`);
    }
});
