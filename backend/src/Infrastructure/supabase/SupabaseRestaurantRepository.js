"use strict";

const CatalogRepositoryError = require("../errors/CatalogRepositoryError");

const RESTAURANT_FIELDS = [
    "id",
    "nome",
    "descricao",
    "categoria",
    "tipo",
    "logo",
    "banner",
    "taxa_entrega",
    "pedido_minimo",
    "status",
    "cidade_atendimento",
    "uf_atendimento",
    "bairros_atendidos",
    "tempo_estimado_min",
    "tempo_estimado_max",
].join(",");

class SupabaseRestaurantRepository {
    constructor(client) {
        this.client = client;
    }

    async listPublished(query) {
        if (query.ids) {
            const { data, error } = await this.client
                .from("empresas_catalogo")
                .select(RESTAURANT_FIELDS)
                .eq("status", true)
                .in("id", query.ids)
                .order("nome");

            if (error) throw new CatalogRepositoryError(error.code);
            return { data: data ?? [], total: data?.length ?? 0 };
        }

        let request = this.client
            .from("empresas_catalogo")
            .select(RESTAURANT_FIELDS, { count: "exact" })
            .eq("status", true)
            .order("nome")
            .range(query.offset, query.offset + query.limite - 1);

        if (query.categoria) request = request.eq("categoria", query.categoria);
        if (query.cidade) request = request.eq("cidade_atendimento", query.cidade);

        const { data, error, count } = await request;
        if (error) throw new CatalogRepositoryError(error.code);

        return {
            data: data ?? [],
            total: count ?? 0,
        };
    }
}

module.exports = SupabaseRestaurantRepository;
