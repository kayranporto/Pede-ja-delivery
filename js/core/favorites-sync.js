"use strict";

(function criarFavoritosSincronizados() {
    let usuario = null;
    let ids = new Set();
    let pronto = null;

    async function iniciar(usuarioInicial = undefined) {
        const local = window.App?.lerJSON("favoritos", []) || [];
        ids = new Set((Array.isArray(local) ? local : []).map(String).filter(Boolean));
        if (usuarioInicial !== undefined) usuario = usuarioInicial;
        else {
            const { data } = await window.db.auth.getUser();
            usuario = data?.user || null;
        }
        if (!usuario) return [...ids];
        let salvos = [];
        try {
            salvos = await window.DeliveryAPI.meusFavoritos();
        } catch (error) {
            console.warn("Favoritos em nuvem indisponíveis:", error);
            return [...ids];
        }
        (salvos || []).forEach((item) => ids.add(String(item.empresa_id)));
        if (ids.size) {
            try {
                await Promise.all([...ids].slice(0, 200).map((empresa_id) => window.DeliveryAPI.adicionarFavorito(empresa_id)));
            } catch (migracaoErro) {
                console.warn("Não foi possível migrar favoritos locais:", migracaoErro);
            }
        }
        window.App.salvarJSON("favoritos", [...ids]);
        return [...ids];
    }

    async function garantir(usuarioInicial = undefined) { if (!pronto) pronto = iniciar(usuarioInicial); await pronto; return ids; }

    async function toggle(empresaId) {
        await garantir();
        const id = String(empresaId || "");
        if (!id) return false;
        const remover = ids.has(id);
        if (usuario) {
            if (remover) {
                await window.DeliveryAPI.removerFavorito(id);
            } else {
                await window.DeliveryAPI.adicionarFavorito(id);
            }
        }
        remover ? ids.delete(id) : ids.add(id);
        window.App.salvarJSON("favoritos", [...ids]);
        dispatchEvent(new CustomEvent("favoritos-atualizados", { detail: [...ids] }));
        return !remover;
    }

    window.FavoritesSync = {
        ready: async (usuarioInicial = undefined) => [...await garantir(usuarioInicial)],
        has: (id) => ids.has(String(id)),
        toggle
    };
})();
