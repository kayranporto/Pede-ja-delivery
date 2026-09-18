"use strict";

(() => {
  if (!/enderecos\.html$/i.test(location.pathname)) return;

  const lista = document.getElementById("listaEnderecos");
  if (!lista) return;
  let executando = false;
  let agendado = 0;

  const toast = (titulo, mensagem = "", tipo = "info") => window.AppToast?.(titulo, mensagem, tipo);

  function localizacaoAtual() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalização não disponível neste navegador."));
      navigator.geolocation.getCurrentPosition(
        (posicao) => resolve({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude, precisao: posicao.coords.accuracy }),
        (erro) => reject(new Error(erro.code === 1 ? "Permissão de localização negada." : "Não foi possível obter sua localização agora.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  function botaoLocalizacao(endereco) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn secundario endereco-gps44";
    botao.textContent = endereco.latitude !== null && endereco.latitude !== undefined ? "⌖ Atualizar GPS" : "⌖ Usar GPS deste local";
    botao.title = "Use esta opção somente quando você estiver fisicamente neste endereço.";
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      const textoOriginal = botao.textContent;
      botao.textContent = "Obtendo localização...";
      try {
        const posicao = await localizacaoAtual();
        await window.DeliveryAPI.request(`/v1/enderecos/${encodeURIComponent(String(endereco.id))}/localizacao`, {
          method: "PATCH",
          body: JSON.stringify({ latitude: posicao.latitude, longitude: posicao.longitude })
        });
        botao.textContent = "✓ GPS atualizado";
        toast("Localização salva", `GPS associado a ${endereco.apelido || "este endereço"}. O endereço escrito não foi alterado.`, "success");
        setTimeout(() => aprimorar(), 700);
      } catch (erro) {
        botao.textContent = textoOriginal;
        toast("Não foi possível salvar o GPS", erro?.message || "Tente novamente.", "error");
      } finally {
        botao.disabled = false;
      }
    });
    return botao;
  }

  async function aprimorar() {
    if (executando) return;
    executando = true;
    try {
      const { data: auth } = await window.db.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const data = await window.DeliveryAPI.meusEnderecos();
      if (!Array.isArray(data)) return;

      const cards = [...lista.querySelectorAll(".item-card")];
      cards.forEach((card) => {
        if (card.dataset.gps44 === "1") return;
        const endereco = data?.find((item) => String(item.id) === card.dataset.enderecoId);
        if (!endereco) return;
        const actions = card.querySelector(".actions");
        if (!actions) return;
        card.dataset.gps44 = "1";
        actions.prepend(botaoLocalizacao(endereco));
        if (endereco.localizacao_atualizada_em) {
          const info = card.querySelector("div:first-child");
          if (info && !info.querySelector(".gps-note44")) {
            const note = document.createElement("small");
            note.className = "gps-note44";
            note.style.cssText = "display:block;margin-top:5px;color:#168821;font-size:9px;font-weight:700";
            note.textContent = "⌖ Localização precisa cadastrada";
            info.append(note);
          }
        }
      });
    } finally {
      executando = false;
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(agendado);
    agendado = setTimeout(aprimorar, 80);
  });
  observer.observe(lista, { childList: true, subtree: true });
  setTimeout(aprimorar, 300);
})();
