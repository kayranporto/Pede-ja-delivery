"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CatalogQuery = require("../src/Domain/value-objects/CatalogQuery");

test("CatalogQuery aplica paginação padrão e normaliza filtros", () => {
    const query = CatalogQuery.from({ categoria: " Pizza ", cidade: "São Paulo" });

    assert.deepEqual({ ...query }, {
        limite: 20,
        offset: 0,
        categoria: "Pizza",
        cidade: "São Paulo",
        ids: null,
    });
    assert.equal(Object.isFrozen(query), true);
});

test("CatalogQuery aceita os limites máximos documentados", () => {
    const query = CatalogQuery.from({ limite: "50", offset: "10000" });

    assert.equal(query.limite, 50);
    assert.equal(query.offset, 10_000);
});

test("CatalogQuery valida e remove IDs duplicados", () => {
    const query = CatalogQuery.from({
        ids: "2a15cbed-20ef-4d37-b368-5804aa53cb68, 2a15cbed-20ef-4d37-b368-5804aa53cb68",
    });

    assert.deepEqual(query.ids, ["2a15cbed-20ef-4d37-b368-5804aa53cb68"]);
});

test("CatalogQuery rejeita paginação e filtros inválidos", () => {
    for (const input of [
        { limite: "0" },
        { limite: "51" },
        { offset: "-1" },
        { offset: "10001" },
        { limite: ["10", "20"] },
        { categoria: "x".repeat(81) },
        { cidade: ["São Paulo"] },
        { ids: "" },
        { ids: "nao-e-uuid" },
        {
            ids: Array.from(
                { length: 201 },
                (_, index) => `2a15cbed-20ef-4d37-b368-${index.toString(16).padStart(12, "0")}`,
            ).join(","),
        },
    ]) {
        assert.throws(() => CatalogQuery.from(input), {
            name: "ValidationError",
            code: "parametro_invalido",
        });
    }
});
