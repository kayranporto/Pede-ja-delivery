"use strict";

(() => {
  const params = new URLSearchParams(location.search);
  const empresaId = params.get("id");
  const actions = document.querySelector(".restaurant-actions");
  if (!empresaId || !actions || !window.DeliveryAPI) return;

  let ativo = false;
  let ocupado = false;
  let restauranteFechado = false;
  let botao = null;

  function aviso(titulo, mensagem, tipo = "info") {
    if (window.AppToast) window.AppToast(titulo, mensagem, tipo, 5500);
  }

  function definirTexto() {
    if (!botao) return;
    botao.disabled = ocupado;
    botao.classList.toggle("is-active", ativo);
    botao.textContent = ocupado
      ? "Aguarde..."
      : ativo
        ? "✓ Aviso ativado · Cancelar"
        : "🔔 Avise-me quando abrir";
  }

  function criarBotao() {
    if (botao) return botao;
    botao = document.createElement("button");
    botao.type = "button";
    botao.id = "btnAvisarAbertura";
    botao.className = "btn-aviso-abertura";
    botao.hidden = true;
    botao.addEventListener("click", alternarAviso);
    actions.prepend(botao);
    return botao;
  }

  function base64Uint8(base64) {
    const pad = "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...binary].map((char) => char.charCodeAt(0)));
  }

  async function garantirPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Este navegador não oferece suporte a notificações push.");
    }
    if (Notification.permission === "denied") {
      throw new Error("As notificações estão bloqueadas nas configurações do navegador.");
    }
    const chave = String(window.DELIVERY_CONFIG?.vapidPublicKey || "").trim();
    if (!chave) throw new Error("As notificações ainda não estão configuradas neste ambiente.");

    const permissao = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permissao !== "granted") throw new Error("Permissão para notificações não concedida.");

    let registro = await navigator.serviceWorker.getRegistration();
    if (!registro) {
      registro = await navigator.serviceWorker.register("../sw.js?v=4.5.0", { updateViaCache: "none" });
    } else {
      registro.update().catch(() => {});
    }
    await navigator.serviceWorker.ready;

    let subscription = await registro.pushManager.getSubscription();
    subscription ||= await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64Uint8(chave)
    });
    const payload = subscription.toJSON();
    await window.DeliveryAPI.salvarPushSubscription(payload.endpoint, payload);
  }

  async function atualizarEstado() {
    if (!restauranteFechado) {
      if (botao) botao.hidden = true;
      return;
    }
    criarBotao().hidden = false;
    try {
      const { data: { user } } = await window.db.auth.getUser();
      if (!user) {
        botao.textContent = "🔔 Entrar para receber aviso";
        botao.title = "Entre na sua conta para acompanhar este restaurante.";
        return;
      }
      ativo = await window.DeliveryAPI.meuAvisoAbertura(empresaId);
      botao.title = ativo
        ? "Cancelar o aviso deste restaurante."
        : "Receba uma notificação quando este restaurante voltar a aceitar pedidos.";
      definirTexto();
    } catch (error) {
      console.warn("Não foi possível consultar o aviso de abertura:", error);
      botao.textContent = "🔔 Avise-me quando abrir";
      botao.title = "Entre na sua conta para ativar o aviso.";
    }
  }

  async function alternarAviso() {
    if (ocupado) return;
    ocupado = true;
    definirTexto();
    try {
      const { data: { user } } = await window.db.auth.getUser();
      if (!user) {
        localStorage.setItem("redirect", `html/restaurante.html?id=${encodeURIComponent(empresaId)}`);
        location.href = "./login.html";
        return;
      }

      if (ativo) {
        await window.DeliveryAPI.cancelarAvisoAbertura(empresaId);
        ativo = false;
        aviso("Aviso cancelado", "Você não receberá mais alertas sobre a abertura deste restaurante.", "success");
      } else {
        await garantirPush();
        await window.DeliveryAPI.criarAvisoAbertura(empresaId);
        ativo = true;
        aviso("Aviso ativado", "Avisaremos quando este restaurante voltar a aceitar pedidos.", "success");
      }
    } catch (error) {
      console.error("Aviso de abertura:", error);
      aviso(
        "Não foi possível atualizar o aviso",
        error?.message || "Verifique sua conexão e tente novamente.",
        "error"
      );
    } finally {
      ocupado = false;
      definirTexto();
    }
  }

  window.addEventListener("empresa-carregada", (event) => {
    restauranteFechado = event.detail?.status === false;
    atualizarEstado();
  });

  if (window.App && typeof window.App.lerJSON === "function") {
    const meta = window.App.lerJSON("empresaAtual", null);
    if (meta?.empresa_id) {
      restauranteFechado = meta.status === false;
      atualizarEstado();
    }
  }
})();
