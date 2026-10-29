"use strict";

(function criarRecortadorDeImagem() {
    const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
    let dialogoAtivo = null;

    function lerImagem(arquivo) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(arquivo);
            const imagem = new Image();
            imagem.onload = () => {
                URL.revokeObjectURL(url);
                resolve(imagem);
            };
            imagem.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Não foi possível abrir esta imagem."));
            };
            imagem.src = url;
        });
    }

    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function recortar(arquivo, opcoes = {}) {
        const proporcao = Number(opcoes.aspectRatio) > 0 ? Number(opcoes.aspectRatio) : 1;
        const larguraSaida = Math.max(1, Math.round(Number(opcoes.width) || 900));
        const alturaSaida = Math.max(1, Math.round(Number(opcoes.height) || larguraSaida / proporcao));
        const limite = Number(opcoes.maxBytes) || 10 * 1024 * 1024;

        if (!arquivo || !TIPOS_PERMITIDOS.has(arquivo.type)) {
            return Promise.reject(new Error("Escolha uma imagem JPG, PNG ou WEBP."));
        }
        if (arquivo.size > limite) {
            return Promise.reject(new Error("A imagem original ultrapassa o limite permitido."));
        }
        if (dialogoAtivo) dialogoAtivo(null);

        return new Promise((resolve) => {
            let imagem = null;
            let escalaBase = 1;
            let escalaAtual = 1;
            let deslocamentoX = 0;
            let deslocamentoY = 0;
            let arrasto = null;
            let finalizado = false;
            let resizePendente = false;

            const fundo = criar("div", "image-cropper-backdrop");
            fundo.dataset.imageCropper = "true";
            const dialogo = criar("section", "image-cropper-dialog");
            dialogo.setAttribute("role", "dialog");
            dialogo.setAttribute("aria-modal", "true");
            dialogo.setAttribute("aria-labelledby", "imageCropperTitle");
            dialogo.setAttribute("aria-describedby", "imageCropperHelp");
            dialogo.tabIndex = -1;

            const cabecalho = criar("header", "image-cropper-header");
            const blocoTitulo = criar("div");
            blocoTitulo.append(
                criar("span", "image-cropper-eyebrow", "AJUSTE DA IMAGEM"),
                criar("h2", "", "Recortar imagem")
            );
            const fechar = criar("button", "image-cropper-close", "×");
            fechar.type = "button";
            fechar.setAttribute("aria-label", "Cancelar recorte");
            cabecalho.append(blocoTitulo, fechar);

            const ajuda = criar("p", "image-cropper-help", "Arraste a imagem para ajustar o enquadramento e use o controle para aproximar ou afastar.");
            ajuda.id = "imageCropperHelp";
            const titulo = blocoTitulo.querySelector("h2");
            titulo.id = "imageCropperTitle";
            const palco = criar("div", "image-cropper-stage");
            palco.style.setProperty("--image-cropper-ratio", String(proporcao));
            palco.setAttribute("aria-label", "Área de recorte. Arraste a imagem para ajustar.");
            const foto = criar("img", "image-cropper-source");
            foto.alt = "Imagem a ser recortada";
            foto.draggable = false;
            palco.append(foto);

            const zoomBloco = criar("div", "image-cropper-zoom");
            const zoomLinha = criar("div", "image-cropper-zoom-labels");
            const zoomRotulo = criar("label", "", "Aproximar imagem");
            zoomRotulo.htmlFor = "imageCropperZoom";
            const zoomValor = criar("output", "", "100%");
            zoomValor.htmlFor = "imageCropperZoom";
            const zoom = criar("input");
            zoom.id = "imageCropperZoom";
            zoom.type = "range";
            zoom.min = "1";
            zoom.max = "3";
            zoom.step = "0.01";
            zoom.value = "1";
            zoom.setAttribute("aria-label", "Zoom da imagem");
            zoomLinha.append(zoomRotulo, zoomValor);
            zoomBloco.append(zoomLinha, zoom);

            const acoes = criar("div", "image-cropper-actions");
            const cancelar = criar("button", "image-cropper-cancel", "Cancelar");
            cancelar.type = "button";
            const confirmar = criar("button", "image-cropper-confirm", "Usar este recorte");
            confirmar.type = "button";
            acoes.append(cancelar, confirmar);

            dialogo.append(cabecalho, ajuda, palco, zoomBloco, acoes);
            fundo.append(dialogo);
            document.body.append(fundo);
            document.body.classList.add("image-cropper-open");

            function dimensoesPalco() {
                const larguraMaxima = Math.max(180, Math.min(dialogo.clientWidth - 36, 680));
                const alturaMaxima = Math.max(160, Math.min(window.innerHeight * 0.45, 480));
                const largura = Math.max(1, Math.min(larguraMaxima, alturaMaxima * proporcao));
                const altura = largura / proporcao;
                palco.style.width = `${largura}px`;
                palco.style.height = `${altura}px`;
                palco.style.aspectRatio = String(proporcao);
            }

            function limitarDeslocamento() {
                if (!imagem) return;
                const escala = escalaBase * escalaAtual;
                const largura = imagem.naturalWidth * escala;
                const altura = imagem.naturalHeight * escala;
                deslocamentoX = Math.min(0, Math.max(palco.clientWidth - largura, deslocamentoX));
                deslocamentoY = Math.min(0, Math.max(palco.clientHeight - altura, deslocamentoY));
            }

            function desenhar() {
                if (!imagem) return;
                limitarDeslocamento();
                const escala = escalaBase * escalaAtual;
                foto.style.width = `${imagem.naturalWidth * escala}px`;
                foto.style.height = `${imagem.naturalHeight * escala}px`;
                foto.style.left = `${deslocamentoX}px`;
                foto.style.top = `${deslocamentoY}px`;
                zoomValor.value = `${Math.round(escalaAtual * 100)}%`;
                zoomValor.textContent = zoomValor.value;
            }

            function centralizar(usarAjuste = true) {
                if (!imagem) return;
                dimensoesPalco();
                escalaBase = Math.max(
                    palco.clientWidth / imagem.naturalWidth,
                    palco.clientHeight / imagem.naturalHeight
                );
                if (usarAjuste) escalaAtual = 1;
                const escala = escalaBase * escalaAtual;
                deslocamentoX = (palco.clientWidth - imagem.naturalWidth * escala) / 2;
                deslocamentoY = (palco.clientHeight - imagem.naturalHeight * escala) / 2;
                desenhar();
            }

            function encerrar(resultado) {
                if (finalizado) return;
                finalizado = true;
                window.removeEventListener("resize", aoRedimensionar);
                document.removeEventListener("keydown", aoTeclado);
                if (fundo.isConnected) fundo.remove();
                document.body.classList.remove("image-cropper-open");
                if (dialogoAtivo === encerrar) dialogoAtivo = null;
                resolve(resultado);
            }

            function aoRedimensionar() {
                if (resizePendente) return;
                resizePendente = true;
                requestAnimationFrame(() => {
                    resizePendente = false;
                    if (finalizado || !imagem) return;
                    // Preserva aproximadamente o ponto central visível durante a mudança de tamanho.
                    const centroX = (palco.clientWidth / 2 - deslocamentoX) / (escalaBase * escalaAtual);
                    const centroY = (palco.clientHeight / 2 - deslocamentoY) / (escalaBase * escalaAtual);
                    dimensoesPalco();
                    escalaBase = Math.max(palco.clientWidth / imagem.naturalWidth, palco.clientHeight / imagem.naturalHeight);
                    deslocamentoX = palco.clientWidth / 2 - centroX * escalaBase * escalaAtual;
                    deslocamentoY = palco.clientHeight / 2 - centroY * escalaBase * escalaAtual;
                    desenhar();
                });
            }

            function aoTeclado(evento) {
                if (evento.key === "Escape") {
                    evento.preventDefault();
                    encerrar(null);
                }
                if (evento.key === "Enter" && evento.target === zoom) {
                    evento.preventDefault();
                }
            }

            foto.onload = () => {
                imagem = foto;
                centralizar();
            };
            foto.onerror = () => {
                encerrar(null);
            };
            foto.src = URL.createObjectURL(arquivo);

            palco.addEventListener("pointerdown", (evento) => {
                if (!imagem || evento.button !== 0) return;
                arrasto = {
                    x: evento.clientX,
                    y: evento.clientY,
                    left: deslocamentoX,
                    top: deslocamentoY,
                    pointerId: evento.pointerId
                };
                palco.setPointerCapture(evento.pointerId);
                palco.classList.add("is-dragging");
            });
            palco.addEventListener("pointermove", (evento) => {
                if (!arrasto || evento.pointerId !== arrasto.pointerId) return;
                deslocamentoX = arrasto.left + evento.clientX - arrasto.x;
                deslocamentoY = arrasto.top + evento.clientY - arrasto.y;
                desenhar();
            });
            const fimArrasto = (evento) => {
                if (!arrasto || (evento.pointerId !== undefined && evento.pointerId !== arrasto.pointerId)) return;
                arrasto = null;
                palco.classList.remove("is-dragging");
            };
            palco.addEventListener("pointerup", fimArrasto);
            palco.addEventListener("pointercancel", fimArrasto);
            palco.addEventListener("lostpointercapture", fimArrasto);

            zoom.addEventListener("input", () => {
                if (!imagem) return;
                const escalaAnterior = escalaBase * escalaAtual;
                const centroX = (palco.clientWidth / 2 - deslocamentoX) / escalaAnterior;
                const centroY = (palco.clientHeight / 2 - deslocamentoY) / escalaAnterior;
                escalaAtual = Number(zoom.value);
                const escalaNova = escalaBase * escalaAtual;
                deslocamentoX = palco.clientWidth / 2 - centroX * escalaNova;
                deslocamentoY = palco.clientHeight / 2 - centroY * escalaNova;
                desenhar();
            });

            confirmar.addEventListener("click", async () => {
                if (!imagem) return;
                confirmar.disabled = true;
                confirmar.textContent = "Preparando recorte...";
                try {
                    const escala = escalaBase * escalaAtual;
                    const sx = Math.max(0, (0 - deslocamentoX) / escala);
                    const sy = Math.max(0, (0 - deslocamentoY) / escala);
                    const sw = Math.min(imagem.naturalWidth - sx, palco.clientWidth / escala);
                    const sh = Math.min(imagem.naturalHeight - sy, palco.clientHeight / escala);
                    const canvas = document.createElement("canvas");
                    canvas.width = larguraSaida;
                    canvas.height = alturaSaida;
                    const contexto = canvas.getContext("2d", { alpha: false });
                    contexto.fillStyle = "#ffffff";
                    contexto.fillRect(0, 0, larguraSaida, alturaSaida);
                    contexto.drawImage(imagem, sx, sy, sw, sh, 0, 0, larguraSaida, alturaSaida);
                    const blob = await new Promise((resolva, rejeite) => canvas.toBlob(
                        (resultado) => resultado ? resolva(resultado) : rejeite(new Error("Não foi possível gerar o recorte.")),
                        "image/webp",
                        0.9
                    ));
                    encerrar(blob);
                } catch (erro) {
                    confirmar.disabled = false;
                    confirmar.textContent = "Usar este recorte";
                    if (window.AppToast) window.AppToast("Erro ao recortar", erro.message, "error");
                }
            });

            fechar.addEventListener("click", () => encerrar(null));
            cancelar.addEventListener("click", () => encerrar(null));
            fundo.addEventListener("click", (evento) => {
                if (evento.target === fundo) encerrar(null);
            });
            window.addEventListener("resize", aoRedimensionar);
            document.addEventListener("keydown", aoTeclado);
            confirmar.disabled = true;
            dialogo.focus();
            dialogoAtivo = encerrar;
        });
    }

    window.ImageCropper = { open: recortar };
})();
