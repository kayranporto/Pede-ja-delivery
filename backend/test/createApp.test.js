"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const createApp = require("../src/Infrastructure/http/createApp");
const CatalogRepositoryError = require("../src/Infrastructure/errors/CatalogRepositoryError");

async function withServer(app, callback) {
    const server = app.listen(0);
    try {
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });
        const address = server.address();
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
}

test("GET /health responde sem acessar o repositório", async () => {
    const app = createApp({
        restaurantRepository: {
            listPublished() {
                assert.fail("Health check não deve consultar o catálogo.");
            },
        },
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/health`, {
            headers: { "X-Request-Id": "health-test-123" },
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-request-id"), "health-test-123");
        assert.equal(body.data.status, "ok");
        assert.equal(body.request_id, "health-test-123");
    });
});

test("GET /api/v1/restaurantes encaminha filtros e retorna paginação", async () => {
    let receivedQuery;
    const app = createApp({
        restaurantRepository: {
            async listPublished(query) {
                receivedQuery = query;
                return { data: [{ id: "restaurant-1", nome: "Pizza da Vila" }], total: 1 };
            },
        },
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(
            `${baseUrl}/api/v1/restaurantes?limite=10&offset=5&categoria=Pizza&cidade=Campinas`,
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual({ ...receivedQuery }, {
            limite: 10,
            offset: 5,
            categoria: "Pizza",
            cidade: "Campinas",
            ids: null,
        });
        assert.deepEqual(body.data, [{ id: "restaurant-1", nome: "Pizza da Vila" }]);
        assert.deepEqual(body.meta, { limite: 10, offset: 5, total: 1 });
        assert.equal(response.headers.get("cache-control"), "public, max-age=30");
        assert.ok(body.request_id);
    });
});

test("GET /api/v1/restaurantes preserva o contrato de busca por favoritos", async () => {
    let receivedQuery;
    const app = createApp({
        restaurantRepository: {
            async listPublished(query) {
                receivedQuery = query;
                return { data: [{ id: query.ids[0], nome: "Pizza da Vila" }], total: 1 };
            },
        },
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(
            `${baseUrl}/api/v1/restaurantes?ids=2a15cbed-20ef-4d37-b368-5804aa53cb68`,
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.data, [{ id: "2a15cbed-20ef-4d37-b368-5804aa53cb68", nome: "Pizza da Vila" }]);
        assert.deepEqual(body.meta, { limite: 1, offset: 0, total: 1 });
        assert.deepEqual(receivedQuery.ids, ["2a15cbed-20ef-4d37-b368-5804aa53cb68"]);
    });
});

test("roteamento Vercel encaminha somente as rotas públicas suportadas", async () => {
    const app = createApp({
        vercelRoute: true,
        restaurantRepository: {
            async listPublished() {
                return { data: [], total: 0 };
            },
        },
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(
            `${baseUrl}/api/index?__api_path=%2Fapi%2Fv1%2Frestaurantes&limite=7`,
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.meta, { limite: 7, offset: 0, total: 0 });
    });
});

test("GET /api/v1/restaurantes devolve 400 para parâmetros inválidos", async () => {
    const app = createApp({
        restaurantRepository: {
            async listPublished() {
                assert.fail("Parâmetros inválidos não devem chegar ao repositório.");
            },
        },
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/restaurantes?limite=100`);
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, "parametro_invalido");
    });
});

test("GET /api/v1/restaurantes traduz falhas do repositório para 502", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};
    const app = createApp({
        restaurantRepository: {
            async listPublished() {
                throw new CatalogRepositoryError("PGRST000");
            },
        },
    });

    try {
        await withServer(app, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/v1/restaurantes`);
            const body = await response.json();

            assert.equal(response.status, 502);
            assert.equal(body.error.code, "falha_catalogo");
            assert.doesNotMatch(JSON.stringify(body), /erro privado do banco/);
        });
    } finally {
        console.error = originalConsoleError;
    }
});
