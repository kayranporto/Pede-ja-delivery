"use strict";

const ValidationError = require("../errors/ValidationError");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10_000;
const MAX_IDS = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseInteger(value, name, fallback, min, max) {
    if (value === undefined || value === "") return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        throw new ValidationError("parametro_invalido", `O parâmetro ${name} é inválido.`);
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new ValidationError("parametro_invalido", `O parâmetro ${name} é inválido.`);
    }

    return parsed;
}

function parseText(value, name, maxLength) {
    if (value === undefined) return "";
    if (typeof value !== "string") {
        throw new ValidationError("parametro_invalido", `O parâmetro ${name} é inválido.`);
    }

    const normalized = value.trim();
    if (normalized.length > maxLength) {
        throw new ValidationError("parametro_invalido", `O parâmetro ${name} é inválido.`);
    }

    return normalized;
}

class CatalogQuery {
    constructor({ limite, offset, categoria, cidade, ids }) {
        this.limite = limite;
        this.offset = offset;
        this.categoria = categoria;
        this.cidade = cidade;
        this.ids = ids;
        Object.freeze(this);
    }

    static from(input) {
        const ids = parseIds(input.ids);
        return new CatalogQuery({
            limite: parseInteger(input.limite, "limite", DEFAULT_LIMIT, 1, MAX_LIMIT),
            offset: parseInteger(input.offset, "offset", 0, 0, MAX_OFFSET),
            categoria: parseText(input.categoria, "categoria", 80),
            cidade: parseText(input.cidade, "cidade", 120),
            ids,
        });
    }
}

function parseIds(value) {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string" || value.length > 10_000) {
        throw new ValidationError("parametro_invalido", "O parâmetro ids é inválido.");
    }

    const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
    if (ids.length < 1 || ids.length > MAX_IDS || ids.some((id) => !UUID_PATTERN.test(id))) {
        throw new ValidationError("parametro_invalido", "O parâmetro ids é inválido.");
    }

    return ids;
}

module.exports = CatalogQuery;
