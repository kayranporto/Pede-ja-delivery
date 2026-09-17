"use strict";

/**
 * Camada nova e independente do carrinho.
 *
 * Este módulo não substitui os módulos legados automaticamente.
 * Ele centraliza leitura, normalização, identificação e gravação dos itens,
 * permitindo uma migração gradual sem interromper o site atual.
 */
(() => {
    if (window.CarrinhoUnificado) return;

    const LIMITE_QUANTIDADE = 99;
    const LIMITE_OBSERVACAO = 300;

    const numero = (valor, padrao = 0) => {
        const resultado = Number(valor);
        return Number.isFinite(resultado) ? resultado : padrao;
    };

    const chaveItem = (item) => {
        const adicionais = (Array.isArray(item.adicionais) ? item.adicionais : [])
            .map((adicional) => String(adicional?.id ?? ""))
            .sort()
            .join("-");
        return [
            String(item.id ?? ""),
            String(item.variante_id ?? "sem-variante"),
            adicionais,
            String(item.observacao ?? ""),
        ].join("|");
    };

    const normalizarAdicional = (adicional) => ({
        id: String(adicional?.id ?? ""),
        nome: String(adicional?.nome ?? "Adicional"),
        preco: Math.max(0, numero(adicional?.preco)),
    });

    const normalizarItem = (item) => {
        const normalizado = {
            ...item,
            id: String(item?.id ?? ""),
            nome: String(item?.nome ?? "Produto"),
            preco: Math.max(0, numero(item?.preco)),
            quantidade: Math.min(
                LIMITE_QUANTIDADE,
                Math.max(1, Math.trunc(numero(item?.quantidade, 1)))
            ),
            variante_id: item?.variante_id == null ? null : String(item.variante_id),
            variante_nome: item?.variante_nome == null ? null : String(item.variante_nome),
            observacao: String(item?.observacao ?? "").trim().slice(0, LIMITE_OBSERVACAO),
            adicionais: (Array.isArray(item?.adicionais) ? item.adicionais : [])
                .map(normalizarAdicional)
                .filter((adicional) => adicional.id),
        };

        normalizado.chave = chaveItem(normalizado);
        return normalizado;
    };

    const ler = () => {
        const itens = window.CartStore?.ler?.();
        if (Array.isArray(itens)) return itens.map(normalizarItem);

        try {
            const legado = JSON.parse(localStorage.getItem("carrinho") || "[]");
            return Array.isArray(legado) ? legado.map(normalizarItem) : [];
        } catch {
            return [];
        }
    };

    const meta = () => {
        const atual = window.CartStore?.meta?.();
        if (atual && typeof atual === "object") return atual;

        try {
            const legado = JSON.parse(localStorage.getItem("carrinhoMeta") || "null");
            return legado && typeof legado === "object" ? legado : null;
        } catch {
            return null;
        }
    };

    const salvar = (itens, dadosMeta = meta()) => {
        const normalizados = (Array.isArray(itens) ? itens : []).map(normalizarItem);
        if (window.CartStore?.salvar) {
            window.CartStore.salvar(normalizados, dadosMeta);
        } else {
            localStorage.setItem("carrinho", JSON.stringify(normalizados));
            if (dadosMeta) localStorage.setItem("carrinhoMeta", JSON.stringify(dadosMeta));
            else localStorage.removeItem("carrinhoMeta");
            window.dispatchEvent(new CustomEvent("carrinho-sincronizar"));
        }
        return normalizados;
    };

    const totalItem = (item) => {
        const adicionais = (item.adicionais || [])
            .reduce((total, adicional) => total + numero(adicional.preco), 0);
        return (numero(item.preco) + adicionais) * Math.max(1, numero(item.quantidade, 1));
    };

    const total = (itens = ler()) => itens.reduce((soma, item) => soma + totalItem(item), 0);

    const encontrar = (identificador, itens = ler()) => itens.find((item) =>
        String(item.chave || chaveItem(item)) === String(identificador)
    ) || null;

    window.CarrinhoUnificado = Object.freeze({
        ler,
        meta,
        salvar,
        normalizarItem,
        chaveItem,
        totalItem,
        total,
        encontrar,
        limiteQuantidade: LIMITE_QUANTIDADE,
        limiteObservacao: LIMITE_OBSERVACAO,
    });

    window.dispatchEvent(new CustomEvent("carrinho-unificado-pronto"));
})();
