"use strict";

const pedido = App.lerJSON("pedidoAtual", null);

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

            row.append(info, quantidade, valor);
            box.append(row);
        });

        if (!box.children.length) box.textContent = "Nenhum item encontrado neste pedido.";
    }

    const subtotal = document.getElementById("subtotalPedido");
    if (subtotal) subtotal.textContent = dinheiro(pedido.subtotal);

    const taxaTotal = document.getElementById("taxaPedido");
    if (taxaTotal) taxaTotal.textContent = dinheiro(pedido.taxa_entrega);

    const total = document.getElementById("totalPedido");
    if (total) total.textContent = dinheiro(pedido.total);
}

renderizarPedido(pedido);
