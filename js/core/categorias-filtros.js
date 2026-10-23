"use strict";

(() => {
    const TABELA = "categorias_filtros_home";
    function normalizar(valor) {
        return String(valor || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
    }
    async function listar() {
        if (!window.db || typeof window.db.from !== "function") throw new Error("O serviço de categorias não está disponível.");
        const { data, error } = await window.db.from(TABELA)
            .select("id,nome,icone,ordem,aliases")
            .order("ordem", { ascending: true })
            .order("nome", { ascending: true });
        if (error) throw error;
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
