"use strict";

class CatalogRepositoryError extends Error {
    constructor(code) {
        super("Falha ao consultar o catálogo público.");
        this.name = "CatalogRepositoryError";
        this.code = code;
    }
}

module.exports = CatalogRepositoryError;
