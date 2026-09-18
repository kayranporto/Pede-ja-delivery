"use strict";

(() => {
  if (!/empresa-dashboard\.html$/i.test(location.pathname)) return;

  let iniciado = false;
  let atualizando = false;

  const toast = (titulo, mensagem = "", tipo = "info") => window.AppToast?.(titulo, mensagem, tipo);

  function obterLocalizacao() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalização não disponível neste navegador."));
      navigator.geolocation.getCurrentPosition(
        (posicao) => resolve(posicao.coords),
        (erro) => reject(new Error(erro.code === 1 ? "Permissão de localização negada." : "Não foi possível obter a localização desta unidade.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  function unidadeId() {
    return document.getElementById("unidadePainelSelect")?.value || "";
  }

  async function carregarEstado() {
    const id = unidadeId();
    const texto = document.getElementById("unidadeGpsStatus44");
    const botao = document.getElementById("unidadeGps44");
    if (!id || !texto || !botao || atualizando) return;
    const unidades = await window.DeliveryAPI.request(`/v1/empresa/unidades?empresa_id=${encodeURIComponent(String(App.lerJSON("empresaAtual", null)?.empresa_id || ""))}`);
    const data = (Array.isArray(unidades) ? unidades : []).find((item) => String(item.id) === String(id));
    if (!data) {
      texto.textContent = "Localização indisponível";
      return;
    }
    const temGps = data.latitude !== null && data.latitude !== undefined && data.longitude !== null && data.longitude !== undefined;
    texto.textContent = temGps ? `GPS configurado para ${data.nome}` : `GPS ainda não configurado para ${data.nome}`;
    botao.textContent = temGps ? "⌖ Atualizar GPS" : "⌖ Definir GPS da unidade";
  }

  async function salvar() {
    const id = unidadeId();
    if (!id) return toast("Selecione uma unidade", "Escolha a unidade que está fisicamente neste local.", "warning");
    const botao = document.getElementById("unidadeGps44");
    atualizando = true;
    botao.disabled = true;
    const textoAnterior = botao.textContent;
    botao.textContent = "Obtendo GPS...";
    try {
      const coords = await obterLocalizacao();
      const meta = App.lerJSON("empresaAtual", null);
      await window.DeliveryAPI.request("/v1/empresa/unidades", {
        method: "POST",
        body: JSON.stringify({
          empresa_id: meta?.empresa_id,
          unidade_id: id,
          payload: { nome: data?.nome || "Unidade", latitude: coords.latitude, longitude: coords.longitude }
        })
      });
      toast("Localização da unidade salva", "A distância logística poderá usar este ponto de coleta.", "success");
    } catch (erro) {
      toast("Não foi possível salvar o GPS", erro?.message || "Tente novamente.", "error");
      botao.textContent = textoAnterior;
    } finally {
      atualizando = false;
      botao.disabled = false;
      await carregarEstado();
    }
  }

  async function iniciar() {
    if (iniciado) return;
    for (let i = 0; i < 120; i += 1) {
      const hero = document.querySelector("#unidades43 .units-hero");
      const select = document.getElementById("unidadePainelSelect");
      if (hero && select?.options?.length) {
        iniciado = true;
        const box = document.createElement("div");
        box.style.cssText = "display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px";
        const botao = document.createElement("button");
        botao.id = "unidadeGps44";
        botao.type = "button";
        botao.style.cssText = "border:0;border-radius:11px;padding:10px 13px;background:#20242e;color:#fff;cursor:pointer;font:700 10px Poppins,sans-serif";
        botao.textContent = "⌖ Definir GPS da unidade";
        botao.addEventListener("click", salvar);
        const status = document.createElement("span");
        status.id = "unidadeGpsStatus44";
        status.style.cssText = "color:#6f7580;font-size:9px;font-weight:600";
        box.append(botao, status);
        const primeiro = hero.querySelector("div:first-child");
        (primeiro || hero).append(box);
        select.addEventListener("change", () => setTimeout(carregarEstado, 100));
        await carregarEstado();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  iniciar().catch((erro) => console.error("Localização da unidade 4.4:", erro));
})();
