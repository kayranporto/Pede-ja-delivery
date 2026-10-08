"use strict";

const pedido = window.App?.lerJSON?.("pedidoAtual", null);
const acompanhar = document.getElementById("acompanharPedido");
const id = pedido?.id;

if (acompanhar && id) {
    acompanhar.href = `acompanhamento.html?id=${encodeURIComponent(String(id))}`;
}
