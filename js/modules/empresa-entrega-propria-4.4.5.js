"use strict";

(() => {
  if (!/empresa-dashboard\.html$/i.test(location.pathname)) return;

  let iniciado = false;
  let carregando = false;
  let entregadores = [];

  const $ = (id) => document.getElementById(id);
  const criar = (tag, texto, classe = "") => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  };
  const unidadeId = () => $("unidadePainelSelect")?.value || "";
  const toast = (titulo, mensagem = "", tipo = "info") => window.AppToast?.(titulo, mensagem, tipo);
  const mensagemErro = (erro) => window.App?.mensagemErro?.(erro) || erro?.message || "Tente novamente.";

  function localizacaoRecente(item) {
    const instante = new Date(item?.localizacao_atualizada_em || 0).getTime();
    return Number.isFinite(instante) && Date.now() - instante <= 30 * 60 * 1000;
  }

  function disponiveis() {
    return entregadores.filter((item) => item.ativo && item.aprovado && item.online && localizacaoRecente(item));
  }

  function renderizarEquipe() {
    const lista = $("entregaEquipeLista445");
    const total = $("entregaEquipeTotal445");
    if (!lista || !total) return;
    const ativos = entregadores.filter((item) => item.ativo);
    total.textContent = `${ativos.length} ativo${ativos.length === 1 ? "" : "s"}`;
    lista.replaceChildren();
    if (!entregadores.length) {
      lista.append(criar("p", "Nenhum entregador próprio vinculado a esta unidade.", "entrega-equipe-vazia445"));
      return;
    }

    entregadores.forEach((item) => {
      const linha = criar("article", undefined, `entrega-equipe-item445${item.ativo ? "" : " inativo"}`);
      const identidade = criar("div");
      const nome = criar("strong", item.nome || item.email || "Entregador");
      const detalhe = criar("small", [item.email, item.veiculo, item.placa].filter(Boolean).join(" • "));
      identidade.append(nome, detalhe);

      const estados = criar("div", undefined, "entrega-equipe-estados445");
      estados.append(
        criar("span", item.ativo ? "Vinculado" : "Desativado", item.ativo ? "ok" : "off"),
        criar("span", item.aprovado ? "Aprovado" : "Aguardando aprovação", item.aprovado ? "ok" : "warn"),
        criar("span", item.online && localizacaoRecente(item) ? "Disponível agora" : "Indisponível", item.online && localizacaoRecente(item) ? "ok" : "off")
      );

      const botao = criar("button", item.ativo ? "Desvincular" : "Reativar", item.ativo ? "remover" : "reativar");
      botao.type = "button";
      botao.addEventListener("click", () => item.ativo ? remover(item, botao) : reativar(item, botao));
      linha.append(identidade, estados, botao);
      lista.append(linha);
    });
  }

  async function carregar() {
    const id = unidadeId();
    const card = $("entregaPropriaCard445");
    if (!id || !card || carregando) return;
    carregando = true;
    card.setAttribute("aria-busy", "true");
    try {
      const resposta = await window.DeliveryAPI.request("/v1/empresa/entregadores?unidade_id=" + encodeURIComponent(id));
      if (id !== unidadeId()) return;
      const unidade = resposta?.unidade;
      const equipe = Array.isArray(resposta?.entregadores) ? resposta.entregadores : [];
      if (!unidade) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      $("entregaUnidadeNome445").textContent = unidade.nome || "Unidade";
      entregadores = equipe;
      renderizarEquipe();
      decorarPedidos();
    } catch (erro) {
      toast("Não foi possível carregar a entrega", mensagemErro(erro), "error");
    } finally {
      carregando = false;
      card.removeAttribute("aria-busy");
      if (id !== unidadeId()) setTimeout(carregar, 0);
    }
  }

  async function salvarConfiguracao(event) {
    event.preventDefault();
    const id = unidadeId();
    const modalidade = $("entregaModalidade445").value;
    const fallback = Number($("entregaFallback445").value || 5);
    if (!id) return toast("Selecione uma unidade", "Escolha a unidade antes de configurar a entrega.", "warning");
    if (!Number.isInteger(fallback) || fallback < 1 || fallback > 60) {
      return toast("Prazo inválido", "Use um prazo entre 1 e 60 minutos.", "warning");
    }
    if (false && modalidade === "propria" && !entregadores.some((item) => item.ativo && item.aprovado)) {
      const continuar = await window.AppConfirm?.({
        titulo: "Ativar entrega própria sem equipe?",
        mensagem: "Nenhum entregador aprovado está ativo nesta unidade. Novos pedidos aguardarão até alguém ser vinculado.",
        confirmar: "Ativar mesmo assim",
        cancelar: "Voltar",
        perigoso: true
      });
      if (continuar !== true) return;
    }
    const botao = $("salvarEntregaModalidade445");
    window.App?.definirCarregando?.(botao, true, "Salvando...");
    const { error } = await window.db.rpc("empresa_unidade_configurar_entrega", {
      p_unidade_id: id,
      p_modalidade: modalidade,
      p_fallback_minutos: fallback
    });
    window.App?.definirCarregando?.(botao, false);
    if (error) return toast("Não foi possível salvar", mensagemErro(error), "error");
    toast("Modalidade de entrega atualizada", atualizarAjudaModalidade() || "A nova regra já vale para esta unidade.", "success");
    await carregar();
  }

  async function adicionar(event) {
    event.preventDefault();
    const id = unidadeId();
    const email = $("entregaEntregadorEmail445").value.trim();
    if (!id || !email) return;
    const botao = $("entregaAdicionar445");
    window.App?.definirCarregando?.(botao, true, "Vinculando...");
    try {
      await window.DeliveryAPI.request("/v1/empresa/entregadores", {
        method: "POST",
        body: JSON.stringify({ unidade_id: id, email })
      });
    } catch (erro) {
      window.App?.definirCarregando?.(botao, false);
      return toast("Não foi possível vincular", mensagemErro(erro), "error");
    }
    window.App?.definirCarregando?.(botao, false);
    $("entregaEntregadorEmail445").value = "";
    toast("Entregador vinculado", "Ele já pode receber ofertas desta unidade quando estiver aprovado, online e com GPS recente.", "success");
    await carregar();
  }

  async function remover(item, botao) {
    const confirmado = await window.AppConfirm?.({
      titulo: "Desvincular entregador?",
      mensagem: `${item.nome || item.email || "Este entregador"} deixará de receber novas ofertas desta unidade.`,
      confirmar: "Desvincular",
      cancelar: "Manter",
      perigoso: true
    });
    if (confirmado !== true) return;
    window.App?.definirCarregando?.(botao, true, "Removendo...");
    try {
      await window.DeliveryAPI.request("/v1/empresa/entregadores/" + encodeURIComponent(String(item.entregador_id)) + "?unidade_id=" + encodeURIComponent(unidadeId()), {
        method: "DELETE"
      });
    } catch (erro) {
      window.App?.definirCarregando?.(botao, false);
      return toast("Não foi possível desvincular", mensagemErro(erro), "error");
    }
    window.App?.definirCarregando?.(botao, false);
    toast("Entregador desvinculado", "Corridas já atribuídas não foram alteradas.", "success");
    await carregar();
  }

  async function reativar(item, botao) {
    window.App?.definirCarregando?.(botao, true, "Reativando...");
    const { error } = await window.db.rpc("empresa_salvar_entregador_proprio", {
      p_unidade_id: unidadeId(),
      p_email: item.email
    });
    window.App?.definirCarregando?.(botao, false);
    if (error) return toast("Não foi possível reativar", mensagemErro(error), "error");
    toast("Entregador reativado", "O vínculo voltou a valer nesta unidade.", "success");
    await carregar();
  }

  async function atribuir(pedidoId, entregadorId, botao) {
    if (!entregadorId) return toast("Escolha o entregador", "Selecione quem fará esta corrida.", "warning");
    window.App?.definirCarregando?.(botao, true, "Atribuindo...");
    let data;
    try {
      data = await window.DeliveryAPI.request("/v1/empresa/pedidos/" + encodeURIComponent(String(pedidoId)) + "/entregador", {
        method: "POST",
        body: JSON.stringify({ entregador_id: String(entregadorId) })
      });
    } catch (erro) {
      window.App?.definirCarregando?.(botao, false);
      return toast("Não foi possível atribuir", mensagemErro(erro), "error");
    }
    window.App?.definirCarregando?.(botao, false);
    if (data !== true) return toast("Não foi possível atribuir", "O pedido não pôde ser atribuído a este entregador.", "error");
    toast("Entregador atribuído", "O pedido já está reservado para este entregador.", "success");
    if (typeof window.carregarPainel === "function") await window.carregarPainel();
    else location.reload();
  }

  function decorarPedidos() {
    const opcoes = disponiveis();
    document.querySelectorAll('[data-entrega-pronta="true"][data-entregador-atribuido="false"]').forEach((card) => {
      const unidadePedido = card.dataset.unidadeId || "";
      if (unidadePedido && unidadePedido !== unidadeId()) return;
      let controle = card.querySelector(".entrega-atribuir445");
      if (!controle) {
        controle = criar("div", undefined, "entrega-atribuir445");
        const titulo = criar("strong", "Atribuição direta");
        const linha = criar("div");
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Entregador próprio");
        const botao = criar("button", "Atribuir", "order-action secondary");
        botao.type = "button";
        botao.addEventListener("click", () => atribuir(card.dataset.pedidoId, select.value, botao));
        linha.append(select, botao);
        controle.append(titulo, linha);
        card.append(controle);
      }
      const select = controle.querySelector("select");
      const botao = controle.querySelector("button");
      select.replaceChildren();
      const inicial = document.createElement("option");
      inicial.value = "";
      inicial.textContent = opcoes.length ? "Escolha da equipe" : "Nenhum próprio disponível";
      select.append(inicial);
      opcoes.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.entregador_id;
        option.textContent = item.nome || item.email || "Entregador";
        select.append(option);
      });
      select.disabled = !opcoes.length;
      botao.disabled = !opcoes.length;
    });
  }

  function montarCard(secao) {
    if ($("entregaPropriaCard445")) return;

    const card = criar("section", undefined, "management-card entrega-propria-card445");
    card.id = "entregaPropriaCard445";
    card.hidden = true;

    const cabecalho = criar("header", undefined, "entrega-propria-head445");
    const tituloBox = criar("div");
    tituloBox.append(
      criar("span", "LOGÍSTICA DA UNIDADE", "entrega-kicker445"),
      criar("h3", "Entregadores da empresa"),
      criar("p", "Esta unidade usa exclusivamente entregadores vinculados à própria empresa.")
    );
    const unidade = criar("strong", "Unidade", "entrega-unidade445");
    unidade.id = "entregaUnidadeNome445";
    cabecalho.append(tituloBox, unidade);

    const equipe = criar("section", undefined, "entrega-equipe445");
    const equipeHead = criar("div", undefined, "entrega-equipe-head445");
    equipeHead.append(criar("h4", "Equipe própria"), criar("span", "0 ativos"));
    equipeHead.lastElementChild.id = "entregaEquipeTotal445";

    const adicionarForm = document.createElement("form");
    adicionarForm.id = "entregaAdicionarForm445";
    const email = document.createElement("input");
    email.id = "entregaEntregadorEmail445";
    email.type = "email";
    email.autocomplete = "email";
    email.required = true;
    email.placeholder = "E-mail do entregador cadastrado";
    const adicionarBotao = criar("button", "Vincular", "btn");
    adicionarBotao.id = "entregaAdicionar445";
    adicionarBotao.type = "submit";
    adicionarForm.append(email, adicionarBotao);
    adicionarForm.addEventListener("submit", adicionar);

    const nota = criar("small", "O entregador precisa ter uma conta de entregador e ser aprovado antes de receber corridas. A empresa controla o vínculo por unidade.");
    const lista = criar("div");
    lista.id = "entregaEquipeLista445";
    lista.className = "entrega-equipe-lista445";
    lista.setAttribute("aria-live", "polite");

    equipe.append(equipeHead, adicionarForm, nota, lista);
    card.append(cabecalho, equipe);

    const referencia = $("freteDistanciaCard44") || $("operacaoUnidade43");
    if (referencia?.parentElement === secao) referencia.insertAdjacentElement("afterend", card);
    else secao.prepend(card);
  }

  async function iniciar() {
    if (iniciado) return;
    for (let tentativa = 0; tentativa < 120; tentativa += 1) {
      const secao = $("operacao");
      const select = $("unidadePainelSelect");
      if (secao && select?.options?.length && window.DeliveryAPI) {
        iniciado = true;
        montarCard(secao);
        select.addEventListener("change", () => setTimeout(carregar, 80));
        const alvosPedidos = [$("pedidosEmpresa"), $("filaCozinha")].filter(Boolean);
        const observarPedidos = () => alvosPedidos.forEach((alvo) => observer.observe(alvo, { childList: true, subtree: true }));
        const observer = new MutationObserver(() => {
          // Pausa o observador enquanto os seletores de entregador são
          // atualizados. Sem isso, as próprias alterações disparavam uma
          // nova observação continuamente e bloqueavam a interface.
          observer.disconnect();
          try {
            decorarPedidos();
          } finally {
            observarPedidos();
          }
        });
        observarPedidos();
        window.addEventListener("focus", () => carregar());
        await carregar();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  iniciar().catch((erro) => console.error("Entrega própria 4.4.5:", erro));
})();
