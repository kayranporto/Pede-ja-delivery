"use strict";

(() => {
    const parametros = new URLSearchParams(window.location.search);
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tipoRecuperacao =
        parametros.get("type") === "recovery"
        || fragmento.get("type") === "recovery";
    const codigoErro = parametros.get("error_code") || fragmento.get("error_code") || "";
    const descricaoErro = parametros.get("error_description") || fragmento.get("error_description") || "";
    const erroDeRecuperacao =
        /^otp_/i.test(codigoErro)
        || /email link is invalid or has expired/i.test(descricaoErro);

    function abrirNovaSenha({ codigoProcessado = false } = {}) {
        const destino = new URL("html/nova-senha.html", window.location.href);
        const parametrosDestino = new URLSearchParams(window.location.search);
        if (codigoProcessado) parametrosDestino.delete("code");
        destino.search = parametrosDestino.toString();
        destino.hash = window.location.hash;
        window.location.replace(destino.href);
    }

    if (tipoRecuperacao || erroDeRecuperacao) {
        abrirNovaSenha();
        return;
    }

    if (parametros.has("code")) {
        const { data: { subscription } } = window.db.auth.onAuthStateChange((evento) => {
            if (evento === "PASSWORD_RECOVERY") abrirNovaSenha({ codigoProcessado: true });
        });

        window.addEventListener("pagehide", () => subscription.unsubscribe(), { once: true });
    }
})();
