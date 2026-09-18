"use strict";

(() => {
  if (!/checkout\.html$/i.test(location.pathname)) return;

  function mostrarUnidade() {
    const meta = window.CartStore?.meta?.() || App.lerJSON("carrinhoMeta", null) || null;
    if (!meta?.unidade_id || !meta?.unidade_nome || document.getElementById("checkoutUnidade43")) return;
    const alvo = document.querySelector(".checkout-flow");
    if (!alvo) return;
    const aviso = document.createElement("div");
    aviso.id = "checkoutUnidade43";
    aviso.setAttribute("role", "status");
    aviso.style.cssText = "display:flex;align-items:center;gap:10px;margin:0 0 14px;padding:11px 13px;border:1px solid var(--checkout-line,var(--line,#e6e8ec));border-radius:12px;background:var(--surface-soft,#f8f9fb);color:var(--checkout-ink,var(--ink,#454b56));font:600 11px Poppins,system-ui,sans-serif";
    const icone = document.createElement("span");
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = "⌂";
    icone.style.cssText = "display:grid;width:28px;height:28px;place-items:center;border-radius:9px;background:#fff0f1;color:#d71928;font-weight:800";
    const texto = document.createElement("span");
    texto.textContent = `Pedido da unidade: ${meta.unidade_nome}`;
    aviso.append(icone, texto);
    alvo.prepend(aviso);
  }

  mostrarUnidade();
})();
