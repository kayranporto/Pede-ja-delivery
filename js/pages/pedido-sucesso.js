"use strict";

const pedido = App.lerJSON("pedidoAtual", null);
let canalPedido = null;
const ordemStatus = ["recebido", "preparando", "saiu_para_entrega", "entregue"];
const nomesStatus = { recebido: "Pedido recebido", preparando: "Em preparo", saiu_para_entrega: "Em rota de entrega", entregue: "Pedido entregue", cancelado: "Pedido cancelado" };

function dinheiro(valor) {
    return App.dinheiro(Number(valor || 0));
}

function renderizarPedido(pedido) {
    if (!pedido) {
        document.getElementById("numeroPedido").textContent = "";
        const resumo = document.getElementById("itensResumo");
        if (resumo) resumo.textContent = "Não foi possível carregar os itens deste pedido.";
        return;
    }

    const numero = document.getElementById("numeroPedido");
    if (numero) numero.textContent = pedido.numero ? `#${pedido.numero}` : "";

    const restaurante = document.getElementById("restauranteNome");
    if (restaurante) restaurante.textContent = pedido.empresa_nome || "Restaurante";

    const categoria = document.getElementById("restauranteCategoria");
    if (categoria) categoria.textContent = pedido.empresa_categoria || "";

    const previsao = document.getElementById("previsaoEntrega");
    if (previsao) {
        const minimo = Number(pedido.previsao_min || 25);
        const maximo = Number(pedido.previsao_max || 45);
        previsao.textContent = pedido.status === "entregue"
            ? "Entregue"
            : `${minimo} – ${maximo} min`;
    }

    const taxa = document.getElementById("taxaEntrega");
    if (taxa) taxa.textContent = dinheiro(pedido.taxa_entrega);

    const pagamento = document.getElementById("formaPagamento");
    if (pagamento) {
        const modalidade = pedido.pagamento_modalidade === "online" ? "Pagamento online" : (pedido.pagamento || "Pagamento na entrega");
        pagamento.textContent = modalidade;
    }

    const pagamentoDetalhe = document.getElementById("pagamentoDetalhe");
    if (pagamentoDetalhe) pagamentoDetalhe.textContent = pedido.pagamento_status === "pago" ? "Pago" : "";

    const endereco = document.getElementById("enderecoEntrega");
    if (endereco) endereco.textContent = pedido.endereco || "Endereço não informado";

    const itens = Array.isArray(pedido.pedido_itens) ? pedido.pedido_itens : [];
    const box = document.getElementById("itensResumo");
    if (box) {
        box.replaceChildren();

        itens.forEach((item) => {
            const row = document.createElement("div");
            row.className = "order-item";

            const thumb = document.createElement("div");
            thumb.className = "food-thumb";
            const imagem = item.imagem_url || item.imagem || item.produto_imagem || item.imagem_produto;
            thumb.style.backgroundImage = `url("${imagem || "../assets/produto-padrao.svg"}")`;

            const info = document.createElement("div");
            const nome = document.createElement("strong");
            nome.textContent = item.nome_produto || "Produto";
            const detalhes = document.createElement("span");
            const adicionais = Array.isArray(item.adicionais) ? item.adicionais : [];
            const partes = [];
            if (item.variante_nome) partes.push(item.variante_nome);
            if (adicionais.length) partes.push(adicionais.map((a) => a.nome).filter(Boolean).join(", "));
            if (item.observacao) partes.push(`Obs.: ${item.observacao}`);
            detalhes.textContent = partes.join(" • ");
            info.append(nome);
            if (detalhes.textContent) info.append(detalhes);

            const quantidade = document.createElement("b");
            quantidade.textContent = `${Number(item.quantidade || 1)}x`;

            const adicionaisTotal = adicionais.reduce((soma, adicional) => soma + Number(adicional.preco || 0), 0);
            const valor = document.createElement("strong");
            valor.textContent = dinheiro((Number(item.preco_unitario || 0) + adicionaisTotal) * Number(item.quantidade || 1));

            row.append(thumb, info, quantidade, valor);
            box.append(row);
        });

        if (!box.children.length) box.textContent = "Nenhum item encontrado neste pedido.";
    }

    const timeline = document.querySelector("#timelinePedido");
    if (timeline) {
        const status = String(pedido.status || "recebido");
        const atual = ordemStatus.indexOf(status);
        timeline.hidden = status === "cancelado";
        timeline.querySelectorAll("li").forEach((li, indice) => {
            const statusItem = li.dataset.status;
            const indiceStatus = ordemStatus.indexOf(statusItem);
            const ativo = statusItem === status;
            li.classList.toggle("done", status === "entregue" || (atual >= 0 && indiceStatus >= 0 && indiceStatus < atual));
            li.classList.toggle("current", ativo);
            const titulo = li.querySelector("strong");
            if (titulo) titulo.textContent = nomesStatus[statusItem] || statusItem;
            const tempo = li.querySelector("small");
            if (tempo) {
                if (ativo) tempo.textContent = status === "entregue" ? "Concluído" : "Status atual";
                else if (atual >= 0 && indiceStatus >= 0 && indiceStatus < atual) tempo.textContent = "Concluído";
                else tempo.textContent = "Aguardando";
            }
        });
    }
    const statusTopo = document.querySelector(".success-sublead");
    if (statusTopo) {
        const status = String(pedido.status || "recebido");
        statusTopo.textContent = status === "cancelado" ? "Este pedido foi cancelado." : (nomesStatus[status] || "Acompanhe o andamento do seu pedido.");
    }

    const subtotal = document.getElementById("subtotalPedido");
    if (subtotal) subtotal.textContent = dinheiro(pedido.subtotal);

    const taxaTotal = document.getElementById("taxaPedido");
    if (taxaTotal) taxaTotal.textContent = dinheiro(pedido.taxa_entrega);

    const total = document.getElementById("totalPedido");
    if (total) total.textContent = dinheiro(pedido.total);

    const acompanhar = document.querySelector(".success-track");
    if (acompanhar && pedido.id) acompanhar.href = `acompanhamento.html?id=${encodeURIComponent(pedido.id)}`;
}

renderizarPedido(pedido);

async function iniciarAtualizacaoTempoReal() {
    if (!pedido?.id || !window.db?.channel) return;
    const { data: { user } = {} } = await window.db.auth.getUser().catch(() => ({ data: {} }));
    if (!user) return;
    canalPedido = db.channel(`pedido-sucesso-${pedido.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedido.id}` }, (payload) => {
            Object.assign(pedido, payload.new);
            renderizarPedido(pedido);
        })
        .subscribe();
}

iniciarAtualizacaoTempoReal();
addEventListener("beforeunload", () => { if (canalPedido) db.removeChannel(canalPedido); });
