"use strict";

/** Camada independente para migração gradual do carrinho. */
(() => {
    if (window.CarrinhoUnificado) return;

    const MAX_QUANTIDADE = 99;
    const MAX_OBSERVACAO = 300;
    const numero = (valor, padrao = 0) => {
        const n = Number(valor);
        return Number.isFinite(n) ? n : padrao;
    };
    const normalizarAdicional = (item) => ({
        id: String(item?.id ?? ""),
        nome: String(item?.nome ?? "Adicional"),
        preco: Math.max(0, numero(item?.preco)),
    });
    const chaveItem = (item) => [
        String(item?.id ?? ""),
        String(item?.variante_id ?? "sem-variante"),
        (Array.isArray(item?.adicionais) ? item.adicionais : [])
            .map((adicional) => String(adicional?.id ?? "")).sort().join("-"),
        String(item?.observacao ?? ""),
    ].join("|");
    const normalizarItem = (item) => {
        const normalizado = {
            ...item,
            id: String(item?.id ?? ""),
            nome: String(item?.nome ?? "Produto"),
            preco: Math.max(0, numero(item?.preco)),
            quantidade: Math.min(MAX_QUANTIDADE, Math.max(1, Math.trunc(numero(item?.quantidade, 1)))),
            variante_id: item?.variante_id == null ? null : String(item.variante_id),
            variante_nome: item?.variante_nome == null ? null : String(item.variante_nome),
            observacao: String(item?.observacao ?? "").trim().slice(0, MAX_OBSERVACAO),
            adicionais: (Array.isArray(item?.adicionais) ? item.adicionais : [])
                .map(normalizarAdicional).filter((adicional) => adicional.id),
        };
        normalizado.chave = chaveItem(normalizado);
        return normalizado;
    };
    const ler = () => {
        const itens = window.CartStore?.ler?.();
        if (Array.isArray(itens)) return itens.map(normalizarItem);
        try {
            const itensLegados = JSON.parse(localStorage.getItem("carrinho") || "[]");
            return Array.isArray(itensLegados) ? itensLegados.map(normalizarItem) : [];
        } catch { return []; }
    };
    const meta = () => window.CartStore?.meta?.() || null;
    const totalItem = (item) => (numero(item.preco) + (item.adicionais || [])
        .reduce((soma, adicional) => soma + numero(adicional.preco), 0)) * item.quantidade;
    const total = (itens = ler) => (Array.isArray(itens) ? itens : itens()).reduce((soma, item) => soma + totalItem(item), 0);

    window.CarrinhoUnificado = Object.freeze({
        ler, meta, normalizarItem, chaveItem, totalItem, total,
        limiteQuantidade: MAX_QUANTIDADE, limiteObservacao: MAX_OBSERVACAO,
    });
    window.dispatchEvent(new CustomEvent("carrinho-unificado-pronto"));
})();
