"use strict";

const crypto = require("node:crypto");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const CatalogQuery = require("../../Domain/value-objects/CatalogQuery");
const ValidationError = require("../../Domain/errors/ValidationError");
const ListRestaurants = require("../../Application/use-cases/ListRestaurants");
const CatalogRepositoryError = require("../errors/CatalogRepositoryError");

function createRequestId(request) {
    const providedId = request.get("x-request-id");
    if (providedId && /^[a-zA-Z0-9._:-]{1,100}$/.test(providedId)) return providedId;
    return crypto.randomUUID();
}

function createApp({ restaurantRepository, allowedOrigins = [], vercelRoute = false }) {
    if (!restaurantRepository) throw new Error("O repositório de restaurantes é obrigatório.");

    const app = express();
    const listRestaurants = new ListRestaurants(restaurantRepository);

    app.disable("x-powered-by");
    app.use(helmet());
    app.use((request, response, next) => {
        request.requestId = createRequestId(request);
        response.set("X-Request-Id", request.requestId);
        next();
    });
    if (vercelRoute) {
        app.use((request, response, next) => {
            const originalUrl = new URL(request.originalUrl, "http://localhost");
            if (request.path !== "/api/index") return next();

            const route = originalUrl.searchParams.get("__api_path");
            if (!["/api/v1/status", "/api/v1/restaurantes"].includes(route)) return next();

            originalUrl.searchParams.delete("__api_path");
            request.url = `${route}${originalUrl.search}`;
            next();
        });
    }
    app.use(cors({
        origin(origin, callback) {
            callback(null, !origin || allowedOrigins.includes(origin));
        },
        methods: ["GET", "HEAD", "OPTIONS"],
        allowedHeaders: ["Content-Type", "X-Request-Id"],
        exposedHeaders: ["X-Request-Id"],
    }));
    app.use(express.json({ limit: "16kb" }));

    app.get("/health", (request, response) => {
        response.set("Cache-Control", "no-store").json({
            data: { status: "ok", servico: "pede-ja-api" },
            request_id: request.requestId,
        });
    });

    app.get("/api/v1/status", (request, response) => {
        response.set("Cache-Control", "no-store").json({
            data: { status: "ok", servico: "pede-ja-api", versao: "1.0.0" },
            request_id: request.requestId,
        });
    });

    app.get("/api/v1/restaurantes", async (request, response) => {
        const query = CatalogQuery.from(request.query);
        const result = await listRestaurants.execute(query);

        response.set("Cache-Control", "public, max-age=30").json({
            data: result.data,
            meta: {
                limite: query.ids ? query.ids.length : query.limite,
                offset: query.ids ? 0 : query.offset,
                total: result.total,
            },
            request_id: request.requestId,
        });
    });

    app.use((request, response) => {
        response.status(404).set("Cache-Control", "no-store").json({
            error: { code: "rota_nao_encontrada", message: "Rota da API não encontrada." },
            request_id: request.requestId,
        });
    });

    app.use((error, request, response, next) => {
        if (response.headersSent) return next(error);

        if (error instanceof ValidationError) {
            return response.status(400).set("Cache-Control", "no-store").json({
                error: { code: error.code, message: error.message },
                request_id: request.requestId,
            });
        }

        if (error instanceof CatalogRepositoryError) {
            console.error("Falha ao consultar catálogo no Supabase", {
                requestId: request.requestId,
                code: error.code,
            });
            return response.status(502).set("Cache-Control", "no-store").json({
                error: { code: "falha_catalogo", message: "Não foi possível consultar os restaurantes." },
                request_id: request.requestId,
            });
        }

        console.error("Erro não tratado na API", {
            requestId: request.requestId,
            name: error.name,
        });
        return response.status(500).set("Cache-Control", "no-store").json({
            error: { code: "erro_interno", message: "Não foi possível processar a solicitação." },
            request_id: request.requestId,
        });
    });

    return app;
}

module.exports = createApp;
