"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CatalogQuery = require("../src/Domain/value-objects/CatalogQuery");
const CatalogRepositoryError = require("../src/Infrastructure/errors/CatalogRepositoryError");
const SupabaseRestaurantRepository = require("../src/Infrastructure/supabase/SupabaseRestaurantRepository");

function createSupabaseStub(result) {
    const calls = [];
    const request = {
        select(...args) {
            calls.push(["select", ...args]);
            return this;
        },
        eq(...args) {
            calls.push(["eq", ...args]);
            return this;
        },
        order(...args) {
            calls.push(["order", ...args]);
            return this;
        },
        range(...args) {
            calls.push(["range", ...args]);
            return this;
        },
        in(...args) {
            calls.push(["in", ...args]);
            return this;
        },
        then(resolve, reject) {
            return Promise.resolve(result).then(resolve, reject);
        },
    };

    return {
        calls,
        client: {
            from(table) {
                calls.push(["from", table]);
                return request;
            },
        },
    };
}

test("repositório consulta somente o catálogo publicado com filtros e paginação", async () => {
    const restaurant = { id: "restaurant-1", nome: "Pizza da Vila" };
    const stub = createSupabaseStub({ data: [restaurant], count: 1, error: null });
    const repository = new SupabaseRestaurantRepository(stub.client);
    const query = CatalogQuery.from({
        limite: "10",
        offset: "5",
        categoria: "Pizza",
        cidade: "Campinas",
        ids: null,
    });

    const result = await repository.listPublished(query);

    assert.deepEqual(result, { data: [restaurant], total: 1 });
    assert.deepEqual(stub.calls.map(([method, ...args]) => [method, ...args]), [
        ["from", "empresas_catalogo"],
        ["select", "id,nome,descricao,categoria,tipo,logo,banner,taxa_entrega,pedido_minimo,status,cidade_atendimento,uf_atendimento,bairros_atendidos,tempo_estimado_min,tempo_estimado_max", { count: "exact" }],
        ["eq", "status", true],
        ["order", "nome"],
        ["range", 5, 14],
        ["eq", "categoria", "Pizza"],
        ["eq", "cidade_atendimento", "Campinas"],
    ]);
});

test("repositório permite buscar favoritos por IDs mantendo apenas restaurantes ativos", async () => {
    const restaurant = { id: "2a15cbed-20ef-4d37-b368-5804aa53cb68", nome: "Pizza da Vila" };
    const stub = createSupabaseStub({ data: [restaurant], count: 1, error: null });
    const repository = new SupabaseRestaurantRepository(stub.client);
    const result = await repository.listPublished(CatalogQuery.from({ ids: restaurant.id }));

    assert.deepEqual(result, { data: [restaurant], total: 1 });
    assert.deepEqual(stub.calls.map(([method, ...args]) => [method, ...args]), [
        ["from", "empresas_catalogo"],
        ["select", "id,nome,descricao,categoria,tipo,logo,banner,taxa_entrega,pedido_minimo,status,cidade_atendimento,uf_atendimento,bairros_atendidos,tempo_estimado_min,tempo_estimado_max"],
        ["eq", "status", true],
        ["in", "id", [restaurant.id]],
        ["order", "nome"],
    ]);
});

test("repositório converte erros do Supabase em erro de infraestrutura", async () => {
    const stub = createSupabaseStub({
        data: null,
        count: null,
        error: { code: "PGRST000" },
    });
    const repository = new SupabaseRestaurantRepository(stub.client);

    await assert.rejects(
        repository.listPublished(CatalogQuery.from({})),
        (error) => error instanceof CatalogRepositoryError && error.code === "PGRST000",
    );
});
