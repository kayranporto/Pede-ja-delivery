"use strict";

const formNovaSenha = document.getElementById("novaSenhaForm");
const statusRecuperacao = document.getElementById("statusRecuperacao");
const novoLink = document.getElementById("novoLinkRecuperacao");

function avisarNovaSenha(titulo, mensagem, tipo = "info", campo = null, tempo = 5000) {
    window.AppToast?.(titulo, mensagem, tipo, tempo);
    campo?.focus?.();
}

function senhaValida(senha) {
    return senha.length >= 8 && /[A-Za-zÀ-ÿ]/.test(senha) && /\d/.test(senha);
}

async function verificarRecuperacao() {
    const url = new URL(window.location.href);
    const parametrosHash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const codigo = url.searchParams.get("code");
    const erroUrl = url.searchParams.get("error") || parametrosHash.get("error");
    const descricaoErro = url.searchParams.get("error_description") || parametrosHash.get("error_description");
    const codigoErro = url.searchParams.get("error_code") || parametrosHash.get("error_code");

    if (erroUrl || codigoErro) {
        let mensagem = "Este link é inválido ou expirou. Solicite uma nova recuperação.";
        if (codigoErro === "otp_expired") {
            mensagem = "Este link expirou ou já foi usado. Solicite uma nova recuperação de senha.";
        } else if (descricaoErro) {
            try {
                mensagem = decodeURIComponent(descricaoErro.replace(/\+/g, " "));
            } catch {
                mensagem = descricaoErro;
            }
        }
        statusRecuperacao.textContent = mensagem;
        novoLink.hidden = false;
        return;
    }

    try {
        if (codigo) {
            const { error } = await db.auth.exchangeCodeForSession(codigo);
            if (error) throw error;
            url.searchParams.delete("code");
            window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        }
    } catch (error) {
        statusRecuperacao.textContent = "Este link não pôde ser validado ou já expirou. Solicite uma nova recuperação.";
        novoLink.hidden = false;
        window.AppToast?.("Link inválido", "Solicite uma nova recuperação de senha.", "error");
        console.error("Erro ao validar o link de recuperação:", error);
        return;
    }

    let sessaoEncontrada = false;

    const atualizarSessao = (session) => {
        if (!session) return;
        sessaoEncontrada = true;
        statusRecuperacao.textContent = "Digite e confirme sua nova senha.";
        formNovaSenha.hidden = false;
    };

    const { data: { subscription } } = db.auth.onAuthStateChange((evento, session) => {
        if (evento === "PASSWORD_RECOVERY" || (evento === "SIGNED_IN" && session)) {
            atualizarSessao(session);
        }
    });

    const { data: { session }, error } = await db.auth.getSession();
    if (!error && session) atualizarSessao(session);

    if (!sessaoEncontrada) {
        statusRecuperacao.textContent = "Este link é inválido ou expirou. Solicite uma nova recuperação.";
        novoLink.hidden = false;
    }

    if (subscription) {
        window.addEventListener("beforeunload", () => subscription.unsubscribe(), { once: true });
    }
}

formNovaSenha.addEventListener("submit", async (event) => {
    event.preventDefault();
    const senhaCampo = document.getElementById("novaSenha");
    const confirmacaoCampo = document.getElementById("confirmarSenha");
    const senha = senhaCampo.value;
    const confirmacao = confirmacaoCampo.value;

    if (!senhaValida(senha)) {
        avisarNovaSenha("Senha fraca", "Use pelo menos 8 caracteres, incluindo uma letra e um número.", "error", senhaCampo);
        return;
    }
    if (senha !== confirmacao) {
        avisarNovaSenha("Senhas diferentes", "A confirmação precisa ser igual à nova senha.", "error", confirmacaoCampo);
        return;
    }

    const botao = event.currentTarget.querySelector("button");
    App.definirCarregando(botao, true, "Atualizando...");
    try {
        const { error } = await db.auth.updateUser({ password: senha });
        if (error) throw error;
        await db.auth.signOut();
        App.limparDadosPrivados();
        statusRecuperacao.textContent = "Senha atualizada. Redirecionando para o login...";
        avisarNovaSenha("Senha atualizada", "Entre novamente usando sua nova senha.", "success", null, 6000);
        setTimeout(() => location.replace("login.html"), 900);
    } catch (error) {
        avisarNovaSenha("Não foi possível atualizar a senha", App.mensagemErro(error), "error");
    } finally {
        App.definirCarregando(botao, false);
    }
});

verificarRecuperacao();
