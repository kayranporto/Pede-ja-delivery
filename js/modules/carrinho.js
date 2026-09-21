"use strict";
(() => {
    const EventoCarrinho = globalThis.CustomEvent || function EventoCarrinho(type, init = {}) {
        this.type = type;
        this.detail = init && init.detail;
    };

    const registrarApiGlobal = (nome, valor) => {
        const anterior = typeof window[nome] === "function" ? window[nome] : null;
        const final = typeof anterior === "function" && anterior !== valor
            ? (...args) => {
                try { anterior(...args); } catch (erro) { console.warn(`API global ${nome} anterior falhou:`, erro); }
                try { return valor(...args); } catch (erro) { console.warn(`API global ${nome} atual falhou:`, erro); }
                return undefined;
            }
            : valor;
        try {
            Object.defineProperty(window, nome, {
                value: final,
                configurable: true,
                writable: true,
                enumerable: false
            });
        } catch {
            window[nome] = final;
        }
    };

    window.__multiDeliveryCarrinhoConsolidado = true;

    registrarApiGlobal("abrirCarrinho", () => {});
    registrarApiGlobal("fecharCarrinho", () => {});
    registrarApiGlobal("adicionarAoCarrinho", adicionarAoCarrinho);

    const drawer = document.getElementById("carrinho");
    const overlay = document.getElementById("overlay");
    const fecharCarrinhoBtn = document.getElementById("fecharCarrinho");
    const listaItens = document.querySelector(".carrinho-itens");
    const resumoQuantidade = document.getElementById("carrinhoQuantidadeResumo");
    const subtotalEl = document.getElementById("subtotal");
    const taxaEntregaEl = document.getElementById("taxaEntrega");
    const totalEl = document.getElementById("total");
    const btnCheckout = document.getElementById("btnCheckout");
    const btnCheckoutTexto = document.getElementById("btnCheckoutTexto");
    const btnCheckoutTotal = document.getElementById("btnCheckoutTotal");
    const carrinhoMinimo = document.getElementById("carrinhoMinimo");
    const carrinhoMinimoTexto = document.getElementById("carrinhoMinimoTexto");
    const carrinhoMinimoValor = document.getElementById("carrinhoMinimoValor");
    const minimoBarra = document.querySelector(".carrinho-minimo-barra");
    const continuarComprandoBtn = document.getElementById("continuarComprando");
    const limparCarrinhoBtn = document.getElementById("limparCarrinhoBtn");

    if (!drawer || !listaItens || !btnCheckout || !btnCheckoutTexto || !btnCheckoutTotal) {
        return;
    }

    function dinheiro(valor) {
        return App?.dinheiro?.(valor) || Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function chaveItem(item) {
        const adicionais = (item.adicionais || []).map((adicional) => String(adicional.id)).sort().join("-");
        return `${item.id}|${item.variante_id || "sem-variante"}|${adicionais}|${String(item.observacao || "")}`;
    }

    function precoItem(item) {
        const base = Number(item.preco || 0);
        const adicionais = Array.isArray(item.adicionais)
            ? item.adicionais.reduce((soma, adicional) => soma + Number(adicional.preco || 0), 0)
            : 0;
        return Number((base + adicionais).toFixed(2));
    }

    function lerCarrinho() {
        if (window.CartStore?.ler) return window.CartStore.ler();
        return App?.lerJSON?.("carrinho", []) || [];
    }

    function lerMeta() {
        if (window.CartStore?.meta) return window.CartStore.meta();
        return App?.lerJSON?.("carrinhoMeta", {}) || {};
    }

    function salvarCarrinho(itens, meta) {
        if (window.CartStore?.salvar) {
            window.CartStore.salvar(itens, meta || null);
            return;
        }
        App?.salvarJSON?.("carrinho", itens);
        if (meta) App?.salvarJSON?.("carrinhoMeta", meta);
        else localStorage.removeItem("carrinhoMeta");
        window.dispatchEvent?.(new EventoCarrinho("carrinho-atualizado", { detail: { itens: itens || [], meta: meta || null } }));
    }

    function abrirCarrinho() {
        drawer.classList.add("aberto");
        overlay?.classList.add("aberto");
        drawer.setAttribute("aria-hidden", "false");
        drawer.removeAttribute("inert");
    }

    function fecharCarrinho() {
        drawer.classList.remove("aberto");
        overlay?.classList.remove("aberto");
        drawer.setAttribute("aria-hidden", "true");
        drawer.setAttribute("inert", "");
    }

    function adicionarAoCarrinho(produto) {
        if (!produto || !produto.id) return null;

        const metaEmpresa = App?.lerJSON?.("empresaAtual", null) || lerMeta();
        const itensAtuais = lerCarrinho();
        const quantidade = Math.max(1, Number(produto.quantidade || 1));
        const item = {
            id: String(produto.id),
            nome: produto.nome || "Produto",
            imagem: produto.imagem || "../assets/produto-padrao.svg",
            preco: Number(produto.preco || 0),
            quantidade,
            observacao: String(produto.observacao || "").trim().slice(0, 300),
            variante_id: produto.variante_id ? String(produto.variante_id) : null,
            variante_nome: produto.variante_nome || null,
            adicionais: Array.isArray(produto.adicionais) ? produto.adicionais.map((adicional) => ({
                id: String(adicional.id),
                nome: adicional.nome || "Adicional",
                preco: Number(adicional.preco || 0)
            })) : [],
            empresa_id: metaEmpresa?.empresa_id || metaEmpresa?.id || null,
            empresa_nome: metaEmpresa?.empresa_nome || metaEmpresa?.nome || null,
            chave: ""
        };
        item.chave = chaveItem(item);

        const existe = itensAtuais.findIndex((it) => String(it.chave || chaveItem(it)) === item.chave);
        if (existe >= 0) {
            itensAtuais[existe].quantidade = Math.min(99, Number(itensAtuais[existe].quantidade || 1) + quantidade);
            itensAtuais[existe].observacao = item.observacao || itensAtuais[existe].observacao || "";
            itensAtuais[existe].adicionais = item.adicionais.length ? item.adicionais : itensAtuais[existe].adicionais || [];
            itensAtuais[existe].chave = chaveItem(itensAtuais[existe]);
        } else {
            itensAtuais.push(item);
        }

        const metaFinal = metaEmpresa && typeof metaEmpresa === "object" ? metaEmpresa : { empresa_id: null };
        salvarCarrinho(itensAtuais, metaFinal);

        // Atualiza a interface imediatamente e confirma que o estado persistido continua disponível.
        const persistido = lerCarrinho();
        const esperado = String(item.chave || chaveItem(item));
        if (!persistido.some((salvo) => String(salvo.chave || chaveItem(salvo)) === esperado)) {
            App?.salvarJSON?.("carrinho", itensAtuais);
            App?.salvarJSON?.("carrinhoBackup", itensAtuais);
            if (metaFinal && typeof metaFinal === "object") App?.salvarJSON?.("carrinhoMeta", metaFinal);
        }

        renderizarItens();
        window.dispatchEvent?.(new CustomEvent("carrinho-atualizado", { detail: { itens: itensAtuais, meta: metaFinal } }));
        return lerCarrinho();
    }

    function atualizarQuantidadeCarrinho(itemChave, delta) {
        const itens = lerCarrinho();
        const indice = itens.findIndex((item) => String(item.chave || chaveItem(item)) === String(itemChave));
        if (indice < 0) return;
        const item = itens[indice];
        const novaQuantidade = Math.min(99, Math.max(1, Number(item.quantidade || 1) + delta));
        item.quantidade = novaQuantidade;
        item.chave = chaveItem(item);
        salvarCarrinho(itens, lerMeta());
        renderizarItens();
        window.dispatchEvent?.(new CustomEvent("carrinho-atualizado", { detail: { itens, meta: lerMeta() } }));
    }

    function removerItem(itemChave) {
        const itens = lerCarrinho().filter((item) => String(item.chave || chaveItem(item)) !== String(itemChave));
        salvarCarrinho(itens, lerMeta());
    }

    function renderizarItens() {
        // O módulo também é exercitado em testes sem o DOM completo do carrinho.
        if (!listaItens) return;
        const itens = lerCarrinho();
        const meta = lerMeta() || {};
        const quantidadeTotal = itens.reduce((total, item) => total + Number(item.quantidade || 1), 0);
        const subtotal = itens.reduce((total, item) => total + precoItem(item) * Number(item.quantidade || 1), 0);
        const taxaEntrega = Number(meta.taxa_entrega || 0);
        const pedidoMinimo = Number(meta.pedido_minimo || 0);
        const total = subtotal + taxaEntrega;

        if (resumoQuantidade) {
            const plural = quantidadeTotal === 1 ? "item" : "itens";
            resumoQuantidade.textContent = `${quantidadeTotal} ${plural}`;
        }

        listaItens.replaceChildren();
        if (!itens.length) {
            const vazio = document.createElement("div");
            vazio.className = "carrinho-vazio";
            vazio.innerHTML = "<p>Seu carrinho está vazio.</p><button type=\"button\" class=\"btn-secundario\">Explorar cardápio</button>";
            const botao = vazio.querySelector("button");
            botao?.addEventListener("click", fecharCarrinho);
            listaItens.append(vazio);
            subtotalEl.textContent = dinheiro(0);
            taxaEntregaEl.textContent = dinheiro(0);
            totalEl.textContent = dinheiro(0);
            btnCheckoutTexto.textContent = "Ir para o checkout";
            btnCheckoutTotal.textContent = dinheiro(0);
            btnCheckout.disabled = true;
            if (carrinhoMinimo) carrinhoMinimo.hidden = true;
            return;
        }

        itens.forEach((item) => {
            const card = document.createElement("div");
            card.className = "item-carrinho";
            card.dataset.chave = String(item.chave || chaveItem(item));

            const imagem = document.createElement("img");
            imagem.src = item.imagem || "../assets/produto-padrao.svg";
            imagem.alt = item.nome || "Produto";
            imagem.loading = "lazy";
            imagem.decoding = "async";
            imagem.onerror = () => { imagem.src = "../assets/produto-padrao.svg"; };

            const conteudo = document.createElement("div");
            conteudo.className = "info-item";

            const titulo = document.createElement("h4");
            titulo.textContent = item.nome || "Produto";

            const detalhes = document.createElement("p");
            const descricao = [];
            if (item.variante_nome) descricao.push(item.variante_nome);
            if (Array.isArray(item.adicionais) && item.adicionais.length) {
                descricao.push(item.adicionais.map((adicional) => adicional.nome || "Adicional").join(", "));
            }
            detalhes.textContent = descricao.length ? descricao.join(" • ") : `${dinheiro(precoItem(item))} por unidade`;

            const valor = document.createElement("strong");
            valor.textContent = dinheiro(precoItem(item) * Number(item.quantidade || 1));

            const controles = document.createElement("div");
            controles.className = "quantidade";

            const menos = document.createElement("button");
            menos.type = "button";
            menos.setAttribute("aria-label", "Diminuir quantidade");
            menos.textContent = "−";
            menos.addEventListener("click", () => atualizarQuantidadeCarrinho(card.dataset.chave, -1));

            const quantidade = document.createElement("span");
            quantidade.textContent = String(item.quantidade || 1);

            const mais = document.createElement("button");
            mais.type = "button";
            mais.setAttribute("aria-label", "Aumentar quantidade");
            mais.textContent = "+";
            mais.addEventListener("click", () => atualizarQuantidadeCarrinho(card.dataset.chave, 1));

            const remover = document.createElement("button");
            remover.type = "button";
            remover.textContent = "Remover";
            remover.className = "remover-item";
            remover.addEventListener("click", () => removerItem(card.dataset.chave));

            controles.append(menos, quantidade, mais);
            conteudo.append(titulo, detalhes, valor, controles, remover);
            card.append(imagem, conteudo);
            listaItens.append(card);
        });

        subtotalEl.textContent = dinheiro(subtotal);
        taxaEntregaEl.textContent = dinheiro(taxaEntrega);
        totalEl.textContent = dinheiro(total);
        btnCheckoutTotal.textContent = dinheiro(total);

        if (carrinhoMinimo) {
            carrinhoMinimo.hidden = false;
            const progresso = pedidoMinimo > 0 ? Math.min(100, Math.max(0, (subtotal / pedidoMinimo) * 100)) : 100;
            if (minimoBarra) {
                const fill = minimoBarra.querySelector("span");
                if (fill) fill.style.width = `${progresso}%`;
                minimoBarra.setAttribute("aria-valuenow", String(Math.round(progresso)));
            }

            if (pedidoMinimo > 0 && subtotal < pedidoMinimo) {
                carrinhoMinimoTexto.textContent = "Falta para o pedido mínimo";
                carrinhoMinimoValor.textContent = dinheiro(pedidoMinimo - subtotal);
                btnCheckoutTexto.textContent = "Falta para o pedido mínimo";
                btnCheckout.disabled = true;
            } else {
                carrinhoMinimoTexto.textContent = "Pedido mínimo atingido";
                carrinhoMinimoValor.textContent = dinheiro(Math.max(pedidoMinimo, 0));
                btnCheckoutTexto.textContent = "Ir para o checkout";
                btnCheckout.disabled = false;
            }
        }
        if (pedidoMinimo <= 0) {
            if (carrinhoMinimo) carrinhoMinimo.hidden = true;
            btnCheckoutTexto.textContent = "Ir para o checkout";
            btnCheckout.disabled = false;
        }
    }

    function limparCarrinho() {
        salvarCarrinho([], lerMeta());
    }

    btnCheckout.addEventListener("click", (event) => {
        event.preventDefault();
        const itens = lerCarrinho();
        const meta = lerMeta();
        const subtotal = itens.reduce((total, item) => total + precoItem(item) * Number(item.quantidade || 1), 0);
        const pedidoMinimo = Number(meta.pedido_minimo || 0);

        if (!itens.length) {
            window.AppToast?.("Carrinho", "Seu carrinho está vazio.", "info");
            return;
        }

        if (pedidoMinimo > 0 && subtotal < pedidoMinimo) {
            window.AppToast?.("Carrinho", `Falta para o pedido mínimo: ${dinheiro(pedidoMinimo - subtotal)}.`, "error");
            return;
        }

        if (window.location.pathname.endsWith("restaurante.html")) {
            window.location.href = "checkout.html";
            return;
        }

        window.location.href = "../html/checkout.html";
    });

    continuarComprandoBtn?.addEventListener("click", fecharCarrinho);
    limparCarrinhoBtn?.addEventListener("click", limparCarrinho);
    fecharCarrinhoBtn?.addEventListener("click", fecharCarrinho);
    overlay?.addEventListener("click", fecharCarrinho);
    document.addEventListener("carrinho-atualizado", renderizarItens);
    window.addEventListener("carrinho-sincronizar", renderizarItens);
    registrarApiGlobal("abrirCarrinho", abrirCarrinho);
    registrarApiGlobal("fecharCarrinho", fecharCarrinho);
    registrarApiGlobal("adicionarAoCarrinho", adicionarAoCarrinho);
    renderizarItens();
})();
