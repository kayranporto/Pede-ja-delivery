"use strict";

(() => {
    // O checkout usa OrderUtils antes que outras camadas possam carregá-lo.
    // Mantemos uma implementação mínima e compatível aqui como fallback para
    // impedir ReferenceError quando a página é aberta diretamente.
    if (!window.OrderUtils) {
        const calcularDesconto = ({ tipo, valor = 0, subtotal = 0, taxa = 0, maximo = null } = {}) => {
            const base = Math.max(0, Number(subtotal) || 0);
            let desconto = 0;
            if (tipo === "percentual") desconto = Math.round(base * Math.min(100, Math.max(0, Number(valor) || 0))) / 100;
            if (tipo === "fixo") desconto = Math.min(base, Math.max(0, Number(valor) || 0));
            if (tipo === "frete") desconto = Math.max(0, Number(taxa) || 0);
            if (maximo !== null && maximo !== undefined && maximo !== "") desconto = Math.min(desconto, Math.max(0, Number(maximo) || 0));
            return Math.round(desconto * 100) / 100;
        };
        window.OrderUtils = Object.freeze({ calcularDesconto });
    }

    // O site usa exclusivamente a interface clara.
    // Preferências antigas de tema não são mais consideradas.
    document.documentElement.style.colorScheme = "light";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.content = "#ea1d2c";
    });

    let enviados = 0;
    const limitePorPagina = 10;
    const appVersion = window.DELIVERY_CONFIG?.appVersion || "desconhecida";
    const correlationId = (() => {
        const chave = "delivery_correlation_id";
        const atual = sessionStorage.getItem(chave);
        if (atual) return atual;
        const novo = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        sessionStorage.setItem(chave, novo);
        return novo;
    })();

    function limpar(texto, maximo = 500) {
        return String(texto || "")
            .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
            .replace(/\b\d{10,14}\b/g, "[numero]")
            .slice(0, maximo);
    }

    async function registrar(nivel, contexto, mensagem, detalhes = {}) {
        if (!window.db || enviados >= limitePorPagina) return false;
        enviados += 1;
        try {
            const { data: { user } } = await window.db.auth.getUser();
            if (!user) return false;
            const seguros = {
                app_version: appVersion,
                correlation_id: correlationId
            };
            Object.entries(detalhes || {}).slice(0, 8).forEach(([chave, valor]) => {
                seguros[limpar(chave, 60)] = limpar(typeof valor === "object" ? JSON.stringify(valor) : valor, 300);
            });
            await window.DeliveryAPI.request("/v1/monitoramento/logs", {
                method: "POST",
                body: JSON.stringify({ nivel: ["info", "warning", "error"].includes(nivel) ? nivel : "error", contexto: limpar(contexto, 120) || "frontend", mensagem: limpar(mensagem), pagina: location.pathname.split("/").pop() || "index.html", detalhes: seguros })
            });
            return true;
        } catch {
            return false;
        }
    }

    addEventListener("error", (event) => {
        registrar("error", "javascript", event.message, { arquivo: event.filename, linha: event.lineno });
    });
    addEventListener("unhandledrejection", (event) => {
        registrar("error", "promise", event.reason?.message || event.reason || "Falha assíncrona");
    });

    window.Monitoramento = Object.freeze({ registrar, correlationId, appVersion });
})();
