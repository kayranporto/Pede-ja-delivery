"use strict";

// 4.5.0 — A operação de entrega deixou de ser uma frota global.
// Os entregadores são gerenciados exclusivamente pelas empresas/unidades
// através de empresa_entregadores e das telas de entrega própria.
(() => {
  if (!/admin\.html$/i.test(location.pathname)) return;

  function removerAreaGlobal() {
    const secao = document.getElementById("entregadores");
    const link = document.querySelector('a[href="#entregadores"]');
    secao?.remove();
    link?.remove();

    const textoHero = document.querySelector(".admin-hero p");
    if (textoHero) {
      textoHero.textContent = "Aprove restaurantes, acompanhe pedidos e mantenha a plataforma saudável. A logística é gerenciada pelas próprias empresas.";
    }

    const tituloHero = document.querySelector(".admin-hero h2");
    if (tituloHero) tituloHero.textContent = "Visão completa da operação.";

    const menuContagem = document.getElementById("entregadoresPendentesMenu");
    menuContagem?.remove();
  }

  async function iniciar() {
    for (let i = 0; i < 150; i += 1) {
      const app = document.getElementById("adminApp");
      if (app && !app.hidden) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    removerAreaGlobal();
  }

  iniciar().catch((erro) => console.error("Remoção da área global de entregadores:", erro));
})();
