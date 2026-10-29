"use strict";

(function criarUploaderDeMidia() {
    const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
    const LIMITE_ORIGINAL = 10 * 1024 * 1024;
    const LIMITE_FINAL = 5 * 1024 * 1024;

    function aviso(titulo, mensagem, tipo = "error") {
        if (window.AppToast) window.AppToast(titulo, mensagem, tipo);
        else alert(`${titulo}: ${mensagem}`);
    }

    function lerImagem(arquivo) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(arquivo);
            const imagem = new Image();
            imagem.onload = () => { URL.revokeObjectURL(url); resolve(imagem); };
            imagem.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir a imagem.")); };
            imagem.src = url;
        });
    }

    function canvasParaBlob(canvas, qualidade) {
        return new Promise((resolve, reject) => canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível otimizar a imagem.")),
            "image/webp",
            qualidade
        ));
    }

    async function otimizar(arquivo, proporcao, larguraMaxima, modoAjuste = "contain") {
        if (!MIME.has(arquivo.type)) throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
        if (arquivo.size > LIMITE_ORIGINAL) throw new Error("A imagem original deve ter no máximo 10 MB.");
        const imagem = await lerImagem(arquivo);
        const proporcaoAlvo = proporcao === "banner" ? 16 / 5 : 1;
        let origemLargura = imagem.naturalWidth;
        let origemAltura = imagem.naturalHeight;
        let sx = 0;
        let sy = 0;

        if (modoAjuste !== "contain") {
            if (origemLargura / origemAltura > proporcaoAlvo) {
                const nova = origemAltura * proporcaoAlvo;
                sx = (origemLargura - nova) / 2;
                origemLargura = nova;
            } else {
                const nova = origemLargura / proporcaoAlvo;
                sy = (origemAltura - nova) / 2;
                origemAltura = nova;
            }
        }

        const largura = proporcao === "banner"
            ? larguraMaxima
            : Math.min(larguraMaxima, Math.max(320, Math.round(modoAjuste === "contain"
                ? Math.min(imagem.naturalWidth, imagem.naturalHeight * proporcaoAlvo)
                : origemLargura)));
        const altura = Math.round(largura / proporcaoAlvo);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const contexto = canvas.getContext("2d", { alpha: modoAjuste === "contain" });

        if (modoAjuste === "contain") {
            // Preserva a imagem inteira e usa transparência no espaço restante.
            const escala = Math.min(largura / imagem.naturalWidth, altura / imagem.naturalHeight);
            const larguraDesenho = imagem.naturalWidth * escala;
            const alturaDesenho = imagem.naturalHeight * escala;
            contexto.clearRect(0, 0, largura, altura);
            contexto.drawImage(
                imagem,
                (largura - larguraDesenho) / 2,
                (altura - alturaDesenho) / 2,
                larguraDesenho,
                alturaDesenho
            );
        } else {
            contexto.drawImage(imagem, sx, sy, origemLargura, origemAltura, 0, 0, largura, altura);
        }

        let blob = await canvasParaBlob(canvas, .84);
        if (blob.size > LIMITE_FINAL) blob = await canvasParaBlob(canvas, .68);
        if (blob.size > LIMITE_FINAL) throw new Error("A imagem continua muito grande após a otimização.");
        return blob;
    }

    function caminhoPublico(url) {
        const marcador = "/storage/v1/object/public/catalogo/";
        const posicao = String(url || "").indexOf(marcador);
        return posicao >= 0 ? decodeURIComponent(String(url).slice(posicao + marcador.length).split("?")[0]) : "";
    }

    function refresh(box) {
        const alvo = document.getElementById(box.dataset.mediaTarget);
        const preview = box.querySelector("img");
        const remover = box.querySelector("[data-media-remove]");
        const url = alvo?.value.trim() || "";
        const modoAjuste = box.querySelector("[data-media-fit]")?.value || "contain";
        preview.style.objectFit = modoAjuste === "contain" ? "contain" : "cover";
        preview.hidden = !url; remover.hidden = !url;
        if (url) preview.src = url;
    }

    async function enviar(box, arquivo) {
        const alvo = document.getElementById(box.dataset.mediaTarget);
        const preview = box.querySelector("img");
        const status = box.querySelector("[data-media-status]");
        const proporcao = box.dataset.mediaRatio || "square";
        const modoAjuste = box.querySelector("[data-media-fit]")?.value || "contain";
        const { data: { user } } = await window.db.auth.getUser();
        if (!user) throw new Error("Entre novamente para enviar imagens.");
        status.textContent = modoAjuste === "contain" ? "Preparando a imagem sem cortes..." : "Ajustando a imagem ao espaço...";
        const blob = await otimizar(arquivo, proporcao, proporcao === "banner" ? 1600 : 900, modoAjuste);
        const anterior = caminhoPublico(alvo.value);
        const chave = box.dataset.mediaKey || crypto.randomUUID();
        const caminho = anterior && anterior.startsWith(`${user.id}/`) ? anterior : `${user.id}/${chave}-${crypto.randomUUID()}`;
        status.textContent = "Enviando imagem...";
        const { error } = await window.db.storage.from("catalogo").upload(caminho, blob, {
            upsert: true, contentType: "image/webp", cacheControl: "3600"
        });
        if (error) throw error;
        const { data } = window.db.storage.from("catalogo").getPublicUrl(caminho);
        alvo.value = `${data.publicUrl}?v=${Date.now()}#fit=${modoAjuste}`;
        alvo.dispatchEvent(new Event("change", { bubbles: true }));
        preview.src = URL.createObjectURL(blob);
        status.textContent = `${Math.round(blob.size / 1024)} KB • ${modoAjuste === "contain" ? "imagem inteira, sem cortes" : "imagem ajustada"} • pronta para salvar`;
        refresh(box);
        aviso("Imagem pronta", "A imagem foi otimizada. Salve o formulário para concluir.", "success");
    }

    async function remover(box) {
        const alvo = document.getElementById(box.dataset.mediaTarget);
        const caminho = caminhoPublico(alvo.value);
        if (caminho) {
            const { error } = await window.db.storage.from("catalogo").remove([caminho]);
            if (error) throw error;
        }
        alvo.value = "";
        alvo.dispatchEvent(new Event("change", { bubbles: true }));
        box.querySelector("[data-media-status]").textContent = "Imagem removida. Salve o formulário.";
        refresh(box);
    }

    function iniciarBox(box) {
        const arquivo = box.querySelector("input[type=file]");
        const ajuste = box.querySelector("[data-media-fit]");
        ajuste?.addEventListener("change", () => {
            refresh(box);
            const status = box.querySelector("[data-media-status]");
            if (status) status.textContent = "Ajuste aplicado à próxima imagem enviada.";
        });
        arquivo.addEventListener("change", async () => {
            if (!arquivo.files?.[0]) return;
            arquivo.disabled = true;
            try { await enviar(box, arquivo.files[0]); }
            catch (erro) { aviso("Não foi possível enviar", window.App?.mensagemErro(erro) || erro.message); }
            finally { arquivo.disabled = false; arquivo.value = ""; }
        });
        box.querySelector("[data-media-remove]").addEventListener("click", async () => {
            try { await remover(box); }
            catch (erro) { aviso("Não foi possível remover", window.App?.mensagemErro(erro) || erro.message); }
        });
        refresh(box);
    }

    function refreshAll() { document.querySelectorAll("[data-media-upload]").forEach(refresh); }
    addEventListener("DOMContentLoaded", () => document.querySelectorAll("[data-media-upload]").forEach(iniciarBox));
    window.MediaUploader = { refreshAll };
})();
