"use strict";

(() => {
    const TABELA = "categorias_filtros_home";
    function normalizar(valor) {
        return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
    }
    async function listar() {
        if (!window.DeliveryAPI?.request) throw new Error("O serviço de categorias não está disponível.");
        const data = await window.DeliveryAPI.request("/v1/categorias-filtros");
        return Array.isArray(data) ? data : [];
    }
    function corresponde(valor, categoria) {
        const procurado = normalizar(valor);
        if (!procurado || !categoria) return false;
        return [categoria.nome, ...(Array.isArray(categoria.aliases) ? categoria.aliases : [])]
            .some((alias) => {
                const termo = normalizar(alias);
                return termo && procurado.includes(termo);
            });
    }
    window.CategoriasFiltros = Object.freeze({ listar, normalizar, corresponde });
})();
