"use strict";

const cards = document.getElementById("listaRestaurantes");
const pesquisa = document.getElementById("campoBusca");
const pesquisaMobile = document.getElementById("campoBuscaMobile");
let categorias = Array.from(document.querySelectorAll(".categoria"));
const listaCategoriasHome = document.querySelector(".categoria-lista");
const menuUsuario = document.getElementById("menuUsuario");
const locationBox = document.querySelector(".location");
const locationText = locationBox?.querySelector("strong");
const cupomButton = document.getElementById("copiarCupom");
const verTodos = document.getElementById("verTodosRestaurantes");
const filtroAberto = document.getElementById("toggleAberto");
const ordenarTaxa = document.getElementById("ordenarTaxa");
const resumoResultado = document.getElementById("resultadoResumo");
const carts = document.querySelectorAll("#botaoAbrirCarrinho, #floatingCart");
const heroBuscar = document.getElementById("heroBuscarRestaurantes");
const topbar = document.querySelector(".topbar");
const topbarClose = document.getElementById("fecharTopbar");
const TOPBAR_STORAGE_KEY = "multi-delivery-topbar-hidden";

function registrarApiGlobal(nome, valor) {
    const anterior = typeof window[nome] === "function" ? window[nome] : null;
    const final = typeof anterior === "function" && anterior !== valor
        ? (...args) => {
            try { anterior(...args); } catch (erro) { console.warn(`API global ${nome} anterior falhou:`, erro); }
            try { return valor(...args); } catch (erro) { console.warn(`API global ${nome} atual falhou:`, erro); }
            return undefined;
        }
        : valor;
    try {
        Object.defineProperty(window, nome, {
            value: final,
            configurable: true,
            writable: true,
            enumerable: false
        });
    } catch (error) {
        window[nome] = final;
    }
}

registrarApiGlobal("abrirCarrinho", () => {
    const drawer = document.getElementById("carrinho");
    drawer?.classList?.add("aberto");
    drawer?.setAttribute?.("aria-hidden", "false");
    drawer?.removeAttribute?.("inert");
    document.getElementById("overlay")?.classList?.add("aberto");
});
registrarApiGlobal("fecharCarrinho", () => {
    const drawer = document.getElementById("carrinho");
    drawer?.classList?.remove("aberto");
    drawer?.setAttribute?.("aria-hidden", "true");
    drawer?.setAttribute?.("inert", "");
    document.getElementById("overlay")?.classList?.remove("aberto");
});
registrarApiGlobal("adicionarAoCarrinho", (produto) => {
    if (!produto || !produto.id) return null;
    const itens = App?.lerJSON?.("carrinho", []) || [];
    const meta = App?.lerJSON?.("empresaAtual", null) || App?.lerJSON?.("carrinhoMeta", {}) || {};
    const item = { ...produto, quantidade: Math.max(1, Number(produto.quantidade || 1)), empresa_id: meta?.empresa_id || meta?.id || null, empresa_nome: meta?.empresa_nome || meta?.nome || null };
    const chave = `${item.id}|${item.variante_id || "sem-variante"}|${String(item.observacao || "")}`;
    const indice = itens.findIndex((atual) => `${atual.id}|${atual.variante_id || "sem-variante"}|${String(atual.observacao || "")}` === chave);
    if (indice >= 0) itens[indice].quantidade = Math.min(99, Number(itens[indice].quantidade || 1) + Number(item.quantidade || 1));
    else itens.push(item);
    App?.salvarJSON?.("carrinho", itens);
    if (meta && typeof meta === "object") App?.salvarJSON?.("carrinhoMeta", meta);
    window.dispatchEvent?.(new CustomEvent("carrinho-atualizado", { detail: { itens, meta } }));
    return itens;
});

if (topbar) {
    try {
        if (localStorage.getItem(TOPBAR_STORAGE_KEY) === "1") topbar.hidden = true;
    } catch (error) {
        console.warn("Aviso: preferência local indisponível", error);
    }
}

topbarClose?.addEventListener("click", () => {
    topbar.hidden = true;
    try {
        localStorage.setItem(TOPBAR_STORAGE_KEY, "1");
    } catch (error) {
        console.warn("Aviso: não foi possível salvar a preferência", error);
    }
});

const filtros = {
    abertoAgora: false,
    ordenarPorTaxa: false
};

// Microanimações de entrada e acessibilidade sem alterar o fluxo de dados.
function iniciarAnimacoes() {
    const elementos = document.querySelectorAll(".cupom, .categorias, .restaurantes, .destaques, .beneficios");
    if (!elementos.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        elementos.forEach((elemento) => {
            elemento.style.opacity = "1";
            elemento.style.transform = "none";
        });
        return;
    }

    elementos.forEach((elemento, index) => {
        elemento.style.opacity = "0";
        elemento.style.transform = "translateY(18px)";
        elemento.style.transition = `opacity .65s cubic-bezier(.2,.8,.2,1) ${Math.min(index * 70, 280)}ms, transform .65s cubic-bezier(.2,.8,.2,1) ${Math.min(index * 70, 280)}ms`;
    });

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px" });

    elementos.forEach((elemento) => observer.observe(elemento));
}

// Profundidade sutil no destaque principal para mouse e trackpad.
function iniciarHeroInterativo() {
    const visual = document.querySelector(".hero-visual");
    if (!visual
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || window.matchMedia("(pointer: coarse)").matches) return;

    let quadro = 0;
    visual.addEventListener("pointermove", (evento) => {
        if (quadro) cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(() => {
            const area = visual.getBoundingClientRect();
            const horizontal = ((evento.clientX - area.left) / area.width) - .5;
            const vertical = ((evento.clientY - area.top) / area.height) - .5;
            visual.style.setProperty("--tilt-x", `${(-vertical * 4).toFixed(2)}deg`);
            visual.style.setProperty("--tilt-y", `${(horizontal * 5).toFixed(2)}deg`);
        });
    });

    visual.addEventListener("pointerleave", () => {
        if (quadro) cancelAnimationFrame(quadro);
        visual.style.setProperty("--tilt-x", "0deg");
        visual.style.setProperty("--tilt-y", "0deg");
    });
}

let empresas = [];
let categoriaSelecionada = "";
let aliasesCategoriaSelecionada = [];
let resumoAvaliacoesEmpresas = new Map();
const favoritos = new Set();
const cacheBuscaProdutos = new Map();
let temporizadorBuscaProdutos = null;
let sequenciaBuscaProdutos = 0;
let empresasCarregadas = false;
let resolverEmpresasCarregadas;
const promessaEmpresasCarregadas = new Promise((resolve) => { resolverEmpresasCarregadas = resolve; });
let estadoBuscaProdutos = {
    termo: "",
    carregando: false,
    falhou: false,
    pronto: false,
    idsEmpresas: new Set(),
    quantidade: 0
};

function sinalizarEmpresasCarregadas() {
    if (empresasCarregadas) return;
    empresasCarregadas = true;
    resolverEmpresasCarregadas();
}


function normalizar(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function dinheiro(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function criarTexto(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
}

function criarCapaVazia(classe) {
    const placeholder = document.createElement("div");
    placeholder.className = classe;
    placeholder.setAttribute("aria-hidden", "true");
    return placeholder;
}

function criarImagemOpcional(src, alt, classeImagem, classePlaceholder) {
    const url = typeof src === "string" ? src.trim() : "";
    if (!url) return criarCapaVazia(classePlaceholder);

    const imagem = document.createElement("img");
    imagem.src = url;
    imagem.alt = alt || "";
    imagem.className = classeImagem;
    imagem.loading = "lazy";
    imagem.decoding = "async";
    imagem.addEventListener("error", () => {
        imagem.replaceWith(criarCapaVazia(classePlaceholder));
    }, { once: true });
    return imagem;
}

function imagemComFallback(src, alt, fallback = "assets/logo-restaurante.svg") {
    const img = document.createElement("img");
    img.src = src || fallback;
    img.alt = alt || "Restaurante";
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
        if (!img.src.endsWith(fallback)) img.src = fallback;
    }, { once: true });
    return img;
}

async function carregarResumoAvaliacoes() {
    try {
        const data = await window.DeliveryAPI.avaliacoesResumoTodos();
        return new Map((data || []).map((item) => [String(item.empresa_id), {
            quantidade: Number(item.quantidade_avaliacoes || 0),
            media: Number(item.nota_media || 0)
        }]));
    } catch (error) {
        console.warn("Não foi possível carregar os resumos de avaliações pela API:", error);
        return new Map();
    }
}

async function carregarDisponibilidadeEmpresas(lista) {
    const momento = new Date().toISOString();
    return Promise.all(lista.map(async (empresa) => {
        if (empresa.status === false) return { ...empresa, abertaAgora: false };
        try {
            const data = await window.DeliveryAPI.disponibilidade(empresa.id, momento);
            return { ...empresa, abertaAgora: data?.aberto === true };
        } catch (erro) {
            console.warn(`Disponibilidade de ${empresa.nome || empresa.id}:`, erro);
            // Não afirmar que o restaurante está aberto quando a API falha.
            return { ...empresa, abertaAgora: false, disponibilidadeDesconhecida: true };
        }
    }));
}

function renderizarEmpresas(lista) {
    cards.replaceChildren();

    if (!lista.length) {
        cards.append(criarTexto("p", "sem-restaurantes", "Nenhum restaurante encontrado."));
        atualizarResumo(0);
        return;
    }

    const fragmento = document.createDocumentFragment();

    lista.forEach((empresa, indice) => {
        const card = document.createElement("article");
        card.className = "card";
        card.dataset.id = empresa.id;

        const link = document.createElement("a");
        link.className = "card-link";
        link.href = `html/restaurante.html?id=${encodeURIComponent(empresa.id)}`;
        link.setAttribute("aria-label", `Abrir cardápio de ${empresa.nome}`);

        const bannerRestaurante = typeof empresa.banner === "string" ? empresa.banner.trim() : "";
        const foto = criarImagemOpcional(
            bannerRestaurante,
            bannerRestaurante ? `Banner de ${empresa.nome || "restaurante"}` : "",
            "restaurant-cover",
            "restaurant-cover-placeholder"
        );
        link.append(foto);

        const body = document.createElement("div");
        body.className = "card-body";

        const header = document.createElement("div");
        header.className = "card-header";
        header.append(criarTexto("h3", "", empresa.nome || "Restaurante"));

        const badgeTexto = indice === 0 ? "Mais pedido" : (indice === 2 ? "Promoção" : "");
        if (badgeTexto) {
            const badge = criarTexto("span", `restaurant-badge ${badgeTexto === "Promoção" ? "promo" : ""}`, badgeTexto);
            badge.setAttribute("aria-hidden", "true");
            card.append(badge);
        }

        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "favorite";
        favorite.dataset.favoriteId = empresa.id;
        const favoritado = favoritos.has(String(empresa.id));
        favorite.textContent = favoritado ? "❤️" : "🤍";
        favorite.setAttribute("aria-label", favoritado ? `Remover ${empresa.nome} dos favoritos` : `Adicionar ${empresa.nome} aos favoritos`);
        favorite.setAttribute("aria-pressed", String(favoritado));
        const logo = imagemComFallback(empresa.logo, `Logo de ${empresa.nome || "restaurante"}`);
        logo.className = "restaurant-logo";
        body.append(logo, header);

        const info = document.createElement("div");
        info.className = "info";
        if (empresa.quantidade_avaliacoes > 0) {
            info.append(criarTexto("span", "rating-info", `⭐ ${Number(empresa.nota_media).toFixed(1)} (${empresa.quantidade_avaliacoes})`));
        } else {
            info.append(criarTexto("span", "rating-info rating-new", "☆ Novo"));
        }
        const taxa = Number(empresa.taxa_entrega || 0);
        info.append(criarTexto("span", "", taxa > 0 ? `🛵 ${dinheiro(taxa)}` : "🛵 Grátis"));
        info.append(criarTexto("span", "", `Pedido mínimo ${dinheiro(empresa.pedido_minimo)}`));
        const minimo = Number(empresa.tempo_estimado_min || 25);
        const maximo = Number(empresa.tempo_estimado_max || 45);
        info.append(criarTexto("span", "", `⏱ ${minimo}–${maximo} min`));
        if (empresa.cidade_atendimento) {
            info.append(criarTexto("span", "", `📍 ${empresa.cidade_atendimento}${empresa.uf_atendimento ? `/${empresa.uf_atendimento}` : ""}`));
        }
        body.append(info);

        const disponibilidadeDesconhecida = empresa.disponibilidadeDesconhecida === true;
        const aberta = !disponibilidadeDesconhecida && (empresa.abertaAgora ?? (empresa.status !== false));
        const status = criarTexto(
            "span",
            `status ${disponibilidadeDesconhecida ? "indisponivel" : (aberta ? "aberto" : "fechado")}`,
            disponibilidadeDesconhecida ? "Status indisponível" : (aberta ? "Aberto agora" : "Fechado")
        );
        body.append(status);
        link.append(body);
        card.append(link, favorite);
        fragmento.append(card);
    });

    cards.append(fragmento);
    atualizarResumo(lista.length);
}

function atualizarResumo(total) {
    if (!resumoResultado) return;

    const textoBusca = normalizar(pesquisa?.value).trim().replace(/\s+/g, " ");
    if (textoBusca.length >= 2 && estadoBuscaProdutos.termo === textoBusca) {
        if (estadoBuscaProdutos.carregando) {
            resumoResultado.textContent = `Buscando "${pesquisa.value.trim()}" nos cardápios...`;
            return;
        }
        if (estadoBuscaProdutos.falhou) {
            resumoResultado.textContent = total
                ? `Mostrando ${total} ${total === 1 ? "restaurante" : "restaurantes"}. Não foi possível pesquisar os cardápios.`
                : "Não foi possível pesquisar os cardápios. Tente novamente.";
            return;
        }
        if (estadoBuscaProdutos.pronto) {
            if (total === 0) {
                resumoResultado.textContent = estadoBuscaProdutos.quantidade
                    ? `Foram encontrados produtos para "${pesquisa.value.trim()}", mas nenhum restaurante corresponde aos filtros atuais.`
                    : `Nenhum restaurante ou produto encontrado para "${pesquisa.value.trim()}".`;
                return;
            }
            const plural = total === 1 ? "restaurante" : "restaurantes";
            resumoResultado.textContent = estadoBuscaProdutos.quantidade
                ? `Mostrando ${total} ${plural}; ${estadoBuscaProdutos.quantidade} produtos correspondem à busca nos cardápios.`
                : `Mostrando ${total} ${plural}. Nenhum produto correspondente foi encontrado nos cardápios.`;
            return;
        }
    }

    if (total === 0) {
        resumoResultado.textContent = "Nenhum restaurante corresponde aos filtros atuais.";
        return;
    }

    const plural = total === 1 ? "restaurante" : "restaurantes";
    if (filtros.abertoAgora && filtros.ordenarPorTaxa) {
        resumoResultado.textContent = `Mostrando ${total} ${plural} abertos agora, ordenados pela menor taxa.`;
        return;
    }
    if (filtros.abertoAgora) {
        resumoResultado.textContent = `Mostrando ${total} ${plural} abertos agora.`;
        return;
    }
    if (filtros.ordenarPorTaxa) {
        resumoResultado.textContent = `Mostrando ${total} ${plural}, ordenados pela menor taxa de entrega.`;
        return;
    }
    resumoResultado.textContent = `Mostrando ${total} ${plural} disponíveis para você.`;
}

function aplicarFiltros() {
    const texto = normalizar(pesquisa?.value).trim().replace(/\s+/g, " ");
    const categoria = normalizar(categoriaSelecionada).trim();
    const idsProdutos = estadoBuscaProdutos.termo === texto
        ? estadoBuscaProdutos.idsEmpresas
        : new Set();

    const resultado = empresas.filter((empresa) => {
        const conteudo = normalizar([
            empresa.nome,
            empresa.descricao,
            empresa.categoria,
            empresa.tipo
        ].join(" "));

        const categoriaEmpresa = normalizar([empresa.categoria, empresa.tipo].filter(Boolean).join(" "));
        const termosCategoria = [categoria, ...aliasesCategoriaSelecionada]
            .map((termo) => normalizar(termo).trim())
            .filter(Boolean);
        const correspondeCategoria = !termosCategoria.length
            || termosCategoria.some((termo) => categoriaEmpresa.includes(termo));
        return (!texto || conteudo.includes(texto) || idsProdutos.has(String(empresa.id))) &&
            correspondeCategoria &&
            (!filtros.abertoAgora || empresa.abertaAgora === true);
    });

    if (filtros.ordenarPorTaxa) {
        resultado.sort((a, b) => (Number(a?.taxa_entrega) || 0) - (Number(b?.taxa_entrega) || 0));
    }

    renderizarEmpresas(resultado);
}

async function concluirBuscaProdutos(resultados, sequencia, termoNormalizado) {
    if (sequencia !== sequenciaBuscaProdutos || normalizar(pesquisa?.value).trim() !== termoNormalizado) return;

    // Aguarda o primeiro carregamento do catálogo para evitar perder resultados
    // se a pessoa começar a pesquisar assim que a página abrir.
    if (!empresasCarregadas) await promessaEmpresasCarregadas;
    if (sequencia !== sequenciaBuscaProdutos || normalizar(pesquisa?.value).trim() !== termoNormalizado) return;

    const encontrados = Array.isArray(resultados) ? resultados : [];
    const existentes = new Set(empresas.map((empresa) => String(empresa.id)));
    const novasPorId = new Map();

    encontrados.forEach((produto) => {
        const empresa = produto?.empresa;
        const id = empresa?.id ? String(empresa.id) : "";
        if (id && !existentes.has(id) && !novasPorId.has(id)) {
            const resumo = resumoAvaliacoesEmpresas.get(id);
            novasPorId.set(id, {
                ...empresa,
                nota_media: resumo?.media || 0,
                quantidade_avaliacoes: resumo?.quantidade || 0
            });
        }
    });

    if (novasPorId.size) {
        const novasDisponibilidades = await carregarDisponibilidadeEmpresas([...novasPorId.values()]);
        if (sequencia !== sequenciaBuscaProdutos || normalizar(pesquisa?.value).trim() !== termoNormalizado) return;
        const idsAtuais = new Set(empresas.map((empresa) => String(empresa.id)));
        empresas.push(...novasDisponibilidades.filter((empresa) => !idsAtuais.has(String(empresa.id))));
    }

    const idsEmpresas = new Set(
        encontrados
            .map((produto) => String(produto?.empresa_id || produto?.empresa?.id || ""))
            .filter(Boolean)
    );
    estadoBuscaProdutos = {
        termo: termoNormalizado,
        carregando: false,
        falhou: false,
        pronto: true,
        idsEmpresas,
        quantidade: encontrados.length
    };
    aplicarFiltros();
}

function programarBuscaProdutos() {
    if (temporizadorBuscaProdutos !== null) {
        window.clearTimeout(temporizadorBuscaProdutos);
        temporizadorBuscaProdutos = null;
    }

    const buscaOriginal = String(pesquisa?.value || "").trim().replace(/\s+/g, " ");
    const termoNormalizado = normalizar(buscaOriginal).trim();
    const sequencia = ++sequenciaBuscaProdutos;

    if (termoNormalizado.length < 2) {
        estadoBuscaProdutos = {
            termo: "",
            carregando: false,
            falhou: false,
            pronto: false,
            idsEmpresas: new Set(),
            quantidade: 0
        };
        aplicarFiltros();
        return;
    }

    estadoBuscaProdutos = {
        termo: termoNormalizado,
        carregando: true,
        falhou: false,
        pronto: false,
        idsEmpresas: new Set(),
        quantidade: 0
    };
    aplicarFiltros();

    // A chave preserva acentos para não reutilizar o resultado de uma busca diferente.
    const chave = buscaOriginal.toLocaleLowerCase("pt-BR");
    const cache = cacheBuscaProdutos.get(chave);
    if (cache) {
        void concluirBuscaProdutos(cache, sequencia, termoNormalizado);
        return;
    }

    temporizadorBuscaProdutos = window.setTimeout(async () => {
        temporizadorBuscaProdutos = null;
        try {
            const resultados = await window.DeliveryAPI.buscarProdutos(buscaOriginal, 30);
            cacheBuscaProdutos.set(chave, resultados);
            await concluirBuscaProdutos(resultados, sequencia, termoNormalizado);
        } catch (erro) {
            if (sequencia !== sequenciaBuscaProdutos || normalizar(pesquisa?.value).trim() !== termoNormalizado) return;
            console.warn("Busca de produtos nos cardápios indisponível:", erro);
            estadoBuscaProdutos = {
                termo: termoNormalizado,
                carregando: false,
                falhou: true,
                pronto: false,
                idsEmpresas: new Set(),
                quantidade: 0
            };
            aplicarFiltros();
        }
    }, 350);
}

async function carregarEmpresas() {
    cards.innerHTML = '<div class="loading">Carregando restaurantes...</div>';

    let data = [];
    let resumoAvaliacoes;
    try {
        [data, resumoAvaliacoes] = await Promise.all([
            window.DeliveryAPI.restaurantes({ limite: 50 }),
            carregarResumoAvaliacoes()
        ]);
    } catch (error) {
        console.error("Erro ao carregar empresas pela API:", error);
        cards.replaceChildren(criarTexto("p", "sem-restaurantes", "Não foi possível carregar os restaurantes. Tente novamente em instantes."));
        sinalizarEmpresasCarregadas();
        return;
    }

    resumoAvaliacoesEmpresas = resumoAvaliacoes;
    const catalogo = (Array.isArray(data) ? data : [])
        .filter((empresa) => empresa?.id && empresa?.nome)
        .map((empresa) => ({
            ...empresa,
            nota_media: resumoAvaliacoes.get(String(empresa.id))?.media || 0,
            quantidade_avaliacoes: resumoAvaliacoes.get(String(empresa.id))?.quantidade || 0
        }));
    empresas = await carregarDisponibilidadeEmpresas(catalogo);
    sinalizarEmpresasCarregadas();
    aplicarFiltros();
}


async function carregarDestaques() {
    const container = document.getElementById("listaProdutos");
    if (!container) return;

    try {
        const restaurantes = await window.DeliveryAPI.restaurantes({ limite: 8 });
        const menus = await Promise.allSettled(
            (Array.isArray(restaurantes) ? restaurantes : [])
                .filter((empresa) => empresa?.id)
                .map(async (empresa) => {
                    const menu = await window.DeliveryAPI.cardapio(empresa.id);
                    return (menu?.produtos || []).slice(0, 3).map((produto) => ({
                        ...produto,
                        empresa_id: produto.empresa_id || empresa.id,
                        empresa_nome: empresa.nome
                    }));
                })
        );
        const data = menus
            .filter((resultado) => resultado.status === "fulfilled")
            .flatMap((resultado) => resultado.value)
            .slice(0, 4);

        container.replaceChildren();
        if (!data.length) {
            const vazio = criarTexto("p", "sem-restaurantes", "Os produtos em destaque aparecerão aqui em breve.");
            container.append(vazio);
            return;
        }

        data.forEach((produto) => {
        const card = document.createElement("a");
        card.className = "produto-destaque";
        card.href = `html/restaurante.html?id=${encodeURIComponent(produto.empresa_id)}`;
        card.setAttribute("aria-label", `Ver ${produto.nome} no cardápio`);
        card.append(criarImagemOpcional(
            produto.imagem,
            produto.imagem ? `Foto de ${produto.nome || "produto"}` : "",
            "product-cover",
            "product-cover-placeholder"
        ));
        const corpo = document.createElement("div");
        const titulo = criarTexto("h3", "", produto.nome || "Produto");
        const descricao = criarTexto("p", "", produto.descricao || "");
        const promocao = Number(produto.promocao || 0);
        const preco = criarTexto("strong", "", dinheiro(promocao > 0 ? promocao : produto.preco));
        corpo.append(titulo, descricao, preco);
        card.append(corpo);
            container.append(card);
        });
    } catch (error) {
        console.warn("Não foi possível carregar os destaques pela API:", error);
        container.replaceChildren(criarTexto("p", "sem-restaurantes", "Os produtos em destaque aparecerão aqui em breve."));
    }
}


function formatarFimOferta(fim) {
    const data = new Date(fim);
    if (!Number.isFinite(data.getTime())) return "Tempo limitado";
    return "Até " + data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function imagemOfertaRelampago(oferta) {
    const figure = document.createElement("div");
    figure.className = "flash-offer-media";
    const src = oferta?.restaurante?.banner || oferta?.restaurante?.logo || "";
    if (src) {
        try {
            const url = new URL(src, window.location.href);
            if (url.protocol === "https:" || url.origin === window.location.origin) {
                const image = document.createElement("img");
                image.src = url.href;
                image.alt = "";
                image.loading = "lazy";
                image.decoding = "async";
                figure.append(image);
            }
        } catch (_) {}
    }
    if (!figure.querySelector("img")) {
        figure.classList.add("flash-offer-media-placeholder");
        const emoji = document.createElement("span");
        emoji.setAttribute("aria-hidden", "true");
        emoji.textContent = "⚡";
        figure.append(emoji);
    }
    const seal = document.createElement("span");
    seal.className = "flash-offer-seal";
    seal.textContent = "OFERTA RELÂMPAGO";
    figure.append(seal);
    return figure;
}

async function copiarCodigoOfertaRelampago(codigo, button) {
    const textoOriginal = button.textContent;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(codigo);
        } else {
            const campo = document.createElement("textarea");
            campo.value = codigo;
            campo.setAttribute("readonly", "");
            campo.style.position = "fixed";
            campo.style.opacity = "0";
            document.body.append(campo);
            campo.select();
            const sucesso = document.execCommand("copy");
            campo.remove();
            if (!sucesso) throw new Error("cópia indisponível");
        }
        button.textContent = "Código copiado!";
        window.AppToast?.("Cupom copiado", "Cole o código no checkout para aproveitar a oferta.", "success");
    } catch (_) {
        window.prompt("Copie o código da oferta:", codigo);
    } finally {
        window.setTimeout(() => { button.textContent = textoOriginal; }, 2200);
    }
}

function renderizarOfertasRelampago(ofertas) {
    const section = document.getElementById("ofertasRelampagoSection");
    const container = document.getElementById("listaOfertasRelampago");
    if (!section || !container) return;
    const lista = (Array.isArray(ofertas) ? ofertas : [])
        .filter((oferta) => oferta?.codigo && oferta?.restaurante?.id && Number(oferta.usos_restantes) > 0);
    container.replaceChildren();
    container.setAttribute("aria-busy", "false");
    section.hidden = lista.length === 0;
    if (!lista.length) return;

    lista.slice(0, 8).forEach((oferta) => {
        const card = document.createElement("article");
        card.className = "flash-offer-card";
        card.append(imagemOfertaRelampago(oferta));

        const content = document.createElement("div");
        content.className = "flash-offer-body";
        const storeLine = document.createElement("div");
        storeLine.className = "flash-offer-store";
        const storeName = document.createElement("span");
        storeName.textContent = oferta.restaurante.nome || "Restaurante";
        storeLine.append(storeName);
        if (oferta.restaurante.cidade) {
            const locality = document.createElement("small");
            locality.textContent = [oferta.restaurante.cidade, oferta.restaurante.uf].filter(Boolean).join(" · ");
            storeLine.append(locality);
        }

        const benefit = document.createElement("strong");
        benefit.className = "flash-offer-benefit";
        benefit.textContent = oferta.beneficio || "Oferta especial";
        const title = document.createElement("h3");
        title.textContent = oferta.titulo || "Oferta por tempo limitado";
        const description = document.createElement("p");
        description.className = "flash-offer-description";
        description.textContent = oferta.descricao || "Use este cupom no checkout antes que acabe.";
        const conditions = document.createElement("div");
        conditions.className = "flash-offer-conditions";
        const count = document.createElement("span");
        count.textContent = "Restam " + Number(oferta.usos_restantes) + " de " + Number(oferta.usos_limite) + " usos";
        const deadline = document.createElement("span");
        deadline.textContent = formatarFimOferta(oferta.fim);
        conditions.append(count, deadline);

        const codeWrap = document.createElement("div");
        codeWrap.className = "flash-offer-code";
        const codeLabel = document.createElement("span");
        codeLabel.textContent = "CÓDIGO";
        const code = document.createElement("strong");
        code.textContent = String(oferta.codigo).toUpperCase();
        codeWrap.append(codeLabel, code);

        const actions = document.createElement("div");
        actions.className = "flash-offer-actions";
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "flash-offer-copy";
        copy.textContent = "Copiar cupom";
        copy.addEventListener("click", () => { void copiarCodigoOfertaRelampago(String(oferta.codigo).toUpperCase(), copy); });
        const visit = document.createElement("a");
        visit.className = "flash-offer-visit";
        visit.href = "html/restaurante.html?id=" + encodeURIComponent(String(oferta.restaurante.id));
        visit.textContent = "Ver restaurante";
        actions.append(copy, visit);

        content.append(storeLine, benefit, title, description, conditions, codeWrap, actions);
        card.append(content);
        container.append(card);
    });
}

async function carregarOfertasRelampago() {
    const section = document.getElementById("ofertasRelampagoSection");
    const container = document.getElementById("listaOfertasRelampago");
    if (!section || !container) return;
    try {
        const resultado = await window.db.functions.invoke("ofertas-relampago", { body: { action: "listar" } });
        if (resultado.error || resultado.data?.error) {
            throw new Error(resultado.data?.error || resultado.error?.message || "Vitrine indisponível");
        }
        renderizarOfertasRelampago(resultado.data?.data || []);
    } catch (error) {
        console.warn("Não foi possível carregar ofertas relâmpago:", error);
        section.hidden = true;
        container.replaceChildren();
        container.setAttribute("aria-busy", "false");
    }
}

async function atualizarMenuUsuario(user) {
    if (!menuUsuario) return;
    if (!user) return;

    menuUsuario.replaceChildren();

    // O atalho administrativo só é exibido após a permissão ser confirmada
    // pelo banco. Em instalações que ainda não receberam a migração 007, a
    // falha da RPC é ignorada e o menu do cliente continua funcionando.
    let conta = null;
    try { conta = await window.DeliveryAPI.getMe(); }
    catch (erro) { console.warn("Não foi possível carregar o estado da conta pela API:", erro); }
    const perfilUsuario = conta?.usuario || null;
    if (conta?.eh_admin === true) {
        const admin = document.createElement("a");
        admin.href = "html/admin.html";
        admin.className = "btn-admin";
        admin.setAttribute("aria-label", "Abrir painel administrativo");

        const icone = document.createElement("span");
        icone.className = "btn-admin-icon";
        icone.setAttribute("aria-hidden", "true");
        icone.textContent = "◆";

        const texto = document.createElement("span");
        texto.textContent = "Painel admin";

        admin.append(icone, texto);
        menuUsuario.append(admin);
    }

    if (conta?.entregador?.aprovado === true && (conta.entregador.vinculos || []).length) {
        const entregas = document.createElement("a");
        entregas.href = "html/entregador.html";
        entregas.className = "btn-driver";
        entregas.setAttribute("aria-label", "Abrir painel do entregador");
        entregas.textContent = "🛵 Entregas";
        menuUsuario.append(entregas);
    }

    const perfil = document.createElement("a");
    perfil.href = "html/perfil.html";
    perfil.className = "btn-primary";
    if (perfilUsuario?.avatar_url) {
        const foto = document.createElement("img"); foto.src = perfilUsuario.avatar_url; foto.alt = "";
        perfil.append(foto);
    }
    const textoPerfil = document.createElement("span"); textoPerfil.textContent = perfilUsuario?.nome || "Minha conta";
    perfil.append(textoPerfil);
    menuUsuario.append(perfil);
}

async function atualizarEndereco(user) {
    if (!locationText) return;
    if (!user) {
        locationText.textContent = "Selecionar endereço";
        return;
    }
    const enderecos = await window.DeliveryAPI.meusEnderecos();
    const data = Array.isArray(enderecos) ? enderecos[0] : null;
    if (!data) {
        locationText.textContent = "Cadastrar endereço";
        return;
    }
    locationText.textContent = `${data.apelido || "Entrega"} • ${data.logradouro || data.rua || ""}, ${data.numero || ""} — ${data.bairro || ""}`;
}

function atualizarContadoresCarrinho() {
    const carrinhoSalvo = App?.lerJSON?.("carrinho", []) || [];
    const carrinho = Array.isArray(carrinhoSalvo) ? carrinhoSalvo : [];
    const quantidade = carrinho.reduce((soma, item) => {
        const valor = Number(item?.quantidade || 0);
        return soma + (Number.isFinite(valor) && valor > 0 ? valor : 0);
    }, 0);
    document.querySelectorAll(".floating-cart span, .mobile-menu-cart .floating-cart-count, .cart-count").forEach((span) => {
        span.textContent = String(quantidade);
    });
}

window.addEventListener("carrinho-atualizado", atualizarContadoresCarrinho);
window.addEventListener("carrinho-sincronizar", atualizarContadoresCarrinho);

heroBuscar?.addEventListener("click", () => {
    document.getElementById("restaurantes")?.scrollIntoView({ behavior: "smooth" });
});

cards?.addEventListener("click", async (event) => {
    const favorito = event.target.closest("[data-favorite-id]");
    if (favorito) {
        event.preventDefault();
        event.stopPropagation();
        const id = String(favorito.dataset.favoriteId);
        try {
            const ativo = window.FavoritesSync
                ? await window.FavoritesSync.toggle(id)
                : !favoritos.has(id);
            ativo ? favoritos.add(id) : favoritos.delete(id);
            if (!window.FavoritesSync) App.salvarJSON("favoritos", [...favoritos]);
        } catch (erro) {
            window.AppToast?.("Não foi possível atualizar", App.mensagemErro(erro), "error");
            return;
        }
        favorito.textContent = favoritos.has(id) ? "❤️" : "🤍";
        favorito.setAttribute("aria-pressed", String(favoritos.has(id)));
        const nomeEmpresa = favorito.closest(".card")?.querySelector("h3")?.textContent || "restaurante";
        favorito.setAttribute("aria-label", favoritos.has(id) ? `Remover ${nomeEmpresa} dos favoritos` : `Adicionar ${nomeEmpresa} aos favoritos`);
        return;
    }

});

pesquisa?.addEventListener("input", () => {
    if (pesquisaMobile && pesquisaMobile.value !== pesquisa.value) pesquisaMobile.value = pesquisa.value;
    programarBuscaProdutos();
});
pesquisaMobile?.addEventListener("input", () => {
    if (pesquisa && pesquisa.value !== pesquisaMobile.value) pesquisa.value = pesquisaMobile.value;
    programarBuscaProdutos();
});

function renderizarCategoriasHome(lista) {
    if (!listaCategoriasHome || !Array.isArray(lista) || !lista.length) return;
    const fragmento = document.createDocumentFragment();
    lista.forEach((categoria) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "categoria";
        botao.dataset.categoria = String(categoria.nome || "");
        botao.dataset.aliases = JSON.stringify(Array.isArray(categoria.aliases) ? categoria.aliases : []);
        botao.setAttribute("aria-pressed", "false");
        const icone = document.createElement("div");
        icone.setAttribute("aria-hidden", "true");
        icone.textContent = categoria.icone || "🍽️";
        const nome = document.createElement("span");
        nome.textContent = categoria.nome || "Categoria";
        botao.append(icone, nome);
        fragmento.append(botao);
    });
    listaCategoriasHome.replaceChildren(fragmento);
    categorias = Array.from(listaCategoriasHome.querySelectorAll(".categoria"));
    const selecionada = categorias.find((botao) => {
        const valores = [botao.dataset.categoria];
        try { valores.push(...JSON.parse(botao.dataset.aliases || "[]")); } catch { /* Sem aliases antigos. */ }
        return valores.some((valor) => normalizar(valor) === normalizar(categoriaSelecionada));
    });
    if (selecionada) {
        categoriaSelecionada = selecionada.dataset.categoria || "";
        try { aliasesCategoriaSelecionada = JSON.parse(selecionada.dataset.aliases || "[]"); } catch { aliasesCategoriaSelecionada = []; }
        selecionada.classList.add("ativa");
        selecionada.setAttribute("aria-pressed", "true");
    } else {
        categoriaSelecionada = "";
        aliasesCategoriaSelecionada = [];
        categorias[0]?.classList.add("ativa");
    }
}
async function carregarCategoriasFiltrosHome() {
    try {
        const lista = await window.CategoriasFiltros?.listar();
        if (Array.isArray(lista) && lista.length) renderizarCategoriasHome(lista);
    } catch (erro) {
        // Os botões estáticos do HTML continuam disponíveis como fallback se o banco não responder.
        console.warn("Categorias de filtros não puderam ser atualizadas.", erro);
    }
}
categorias[0]?.classList.add("ativa");
listaCategoriasHome?.addEventListener("click", (evento) => {
    const categoria = evento.target.closest(".categoria");
    if (!categoria || !listaCategoriasHome.contains(categoria)) return;
    categorias = Array.from(listaCategoriasHome.querySelectorAll(".categoria"));
    categorias.forEach((item) => {
        item.classList.remove("ativa");
        item.setAttribute("aria-pressed", "false");
    });
    categoria.classList.add("ativa");
    categoria.setAttribute("aria-pressed", "true");
    categoriaSelecionada = categoria.dataset.categoria || "";
    try { aliasesCategoriaSelecionada = JSON.parse(categoria.dataset.aliases || "[]"); } catch { aliasesCategoriaSelecionada = []; }
    aplicarFiltros();
    document.getElementById("restaurantes")?.scrollIntoView({ behavior: "smooth" });
});
void carregarCategoriasFiltrosHome();

function editarEndereco() {
    window.location.href = "html/enderecos.html?redirect=../index.html";
}

if (locationBox) {
    locationBox.setAttribute("aria-label", "Alterar endereço de entrega");
    locationBox.addEventListener("click", editarEndereco);
}

cupomButton?.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText("BEMVINDO20");
        cupomButton.textContent = "Cupom copiado!";
        window.setTimeout(() => { cupomButton.textContent = "Copiar cupom"; }, 2000);
    } catch {
        window.prompt("Copie o cupom:", "BEMVINDO20");
    }
});

verTodos?.addEventListener("click", (event) => {
    event.preventDefault();
    if (temporizadorBuscaProdutos !== null) {
        window.clearTimeout(temporizadorBuscaProdutos);
        temporizadorBuscaProdutos = null;
    }
    sequenciaBuscaProdutos += 1;
    estadoBuscaProdutos = {
        termo: "",
        carregando: false,
        falhou: false,
        pronto: false,
        idsEmpresas: new Set(),
        quantidade: 0
    };
    categoriaSelecionada = "";
    aliasesCategoriaSelecionada = [];
    filtros.abertoAgora = false;
    filtros.ordenarPorTaxa = false;
    filtroAberto?.classList.remove("active");
    ordenarTaxa?.classList.remove("active");
    if (pesquisa) pesquisa.value = "";
    if (pesquisaMobile) pesquisaMobile.value = "";
    categorias.forEach((item) => item.classList.toggle("ativa", !item.dataset.categoria));
    categorias.forEach((item) => item.setAttribute("aria-pressed", item.dataset.categoria ? "false" : "true"));
    aplicarFiltros();
});

filtroAberto?.addEventListener("click", () => {
    filtros.abertoAgora = !filtros.abertoAgora;
    filtroAberto.classList.toggle("active", filtros.abertoAgora);
    filtroAberto.setAttribute("aria-pressed", String(filtros.abertoAgora));
    aplicarFiltros();
});

ordenarTaxa?.addEventListener("click", () => {
    filtros.ordenarPorTaxa = !filtros.ordenarPorTaxa;
    ordenarTaxa.classList.toggle("active", filtros.ordenarPorTaxa);
    ordenarTaxa.setAttribute("aria-pressed", String(filtros.ordenarPorTaxa));
    aplicarFiltros();
});

carts.forEach((cart) => {
    cart.setAttribute("aria-label", "Abrir carrinho");

    const abrir = () => {
        const carrinhoSalvo = App?.lerJSON?.("carrinho", []) || [];
        const carrinho = Array.isArray(carrinhoSalvo) ? carrinhoSalvo : [];
        if (!carrinho.length) {
            window.AppToast?.("Carrinho vazio", "Adicione pelo menos um item para seguir para o checkout.", "info");
            document.getElementById("restaurantes")?.scrollIntoView({ behavior: "smooth" });
            return;
        }
        window.location.href = "html/checkout.html";
    };

    cart.addEventListener("click", abrir);
});

(async function iniciarHome() {
    atualizarContadoresCarrinho();
    iniciarAnimacoes();
    iniciarHeroInterativo();
    const conteudo = Promise.allSettled([carregarEmpresas(), carregarDestaques(), carregarOfertasRelampago()]);
    const usuario = window.db.auth.getUser()
        .then(({ data }) => data?.user || null)
        .catch(() => null);
    const user = await usuario;
    const favoritosSalvos = window.FavoritesSync
        ? window.FavoritesSync.ready(user)
        : Promise.resolve(App.lerJSON("favoritos", []) || []);
    const [salvos] = await Promise.all([
        favoritosSalvos,
        atualizarEndereco(user),
        atualizarMenuUsuario(user)
    ]);
    favoritos.clear();
    salvos.forEach((id) => favoritos.add(String(id)));
    await conteudo;
    if (empresas.length) aplicarFiltros();
})();

// Atalhos de busca e teclado da página inicial.
document.addEventListener('DOMContentLoaded', () => {
    const busca = window.matchMedia("(max-width: 680px)").matches
        ? (document.getElementById("campoBuscaMobile") || document.getElementById("campoBusca"))
        : (document.getElementById("campoBusca") || document.getElementById("campoBuscaMobile"));
    document.querySelectorAll('[data-search]').forEach((botao) => {
      botao.addEventListener('click', () => {
        if (!busca) return;
        busca.value = botao.dataset.search || '';
        busca.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('restaurantes')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    document.addEventListener('keydown', (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        busca?.focus();
      }
    });
  });
