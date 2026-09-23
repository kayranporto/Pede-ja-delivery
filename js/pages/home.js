"use strict";

const cards = document.getElementById("listaRestaurantes");
const pesquisa = document.getElementById("campoBusca");
const categorias = document.querySelectorAll(".categoria");
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
const favoritos = new Set();

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

const FOTOS_REAIS_HOME = {
    hamburguer: "https://images.unsplash.com/photo-1524817935500-bb9d3a1dd6c5?auto=format&fit=crop&q=82&w=1000",
    pizza: "https://images.unsplash.com/photo-1566843972142-a7fcb70de55a?auto=format&fit=crop&q=82&w=1000",
    sushi: "https://images.unsplash.com/photo-1567620815168-8afeeb18de17?auto=format&fit=crop&q=82&w=1000",
    acai: "https://images.unsplash.com/photo-1627308594190-a057cd4bfac8?auto=format&fit=crop&q=82&w=1000"
};

function fotoRealPorTexto(texto = "") {
    const valor = normalizar(texto);
    if (/sushi|japones|japonesa/.test(valor)) return FOTOS_REAIS_HOME.sushi;
    if (/pizza|pizzaria/.test(valor)) return FOTOS_REAIS_HOME.pizza;
    if (/acai|sobremesa|doce/.test(valor)) return FOTOS_REAIS_HOME.acai;
    if (/hamburg|lanche|burger|fast food/.test(valor)) return FOTOS_REAIS_HOME.hamburguer;
    return FOTOS_REAIS_HOME.hamburguer;
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
            return { ...empresa, abertaAgora: true };
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

        link.append(imagemComFallback(empresa.logo || fotoRealPorTexto([empresa.nome, empresa.categoria, empresa.tipo].join(" ")), empresa.nome));

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
        body.append(header);

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

        const aberta = empresa.abertaAgora ?? (empresa.status !== false);
        const status = criarTexto("span", `status ${aberta ? "aberto" : "fechado"}`, aberta ? "Aberto" : "Fechado");
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
    const texto = normalizar(pesquisa?.value);
    const categoria = normalizar(categoriaSelecionada);

    const resultado = empresas.filter((empresa) => {
        const conteudo = normalizar([
            empresa.nome,
            empresa.descricao,
            empresa.categoria,
            empresa.tipo
        ].join(" "));

        return (!texto || conteudo.includes(texto)) &&
            (!categoria || conteudo.includes(categoria)) &&
            (!filtros.abertoAgora || empresa.abertaAgora === true);
    });

    if (filtros.ordenarPorTaxa) {
        resultado.sort((a, b) => (Number(a?.taxa_entrega) || 0) - (Number(b?.taxa_entrega) || 0));
    }

    renderizarEmpresas(resultado);
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
        return;
    }

    const catalogo = (Array.isArray(data) ? data : [])
        .filter((empresa) => empresa?.id && empresa?.nome)
        .map((empresa) => ({
            ...empresa,
            nota_media: resumoAvaliacoes.get(String(empresa.id))?.media || 0,
            quantidade_avaliacoes: resumoAvaliacoes.get(String(empresa.id))?.quantidade || 0
        }));
    empresas = await carregarDisponibilidadeEmpresas(catalogo);
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
        card.append(imagemComFallback(produto.imagem || fotoRealPorTexto([produto.nome, produto.descricao].join(" ")), produto.nome, "assets/produto-padrao.svg"));
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

pesquisa?.addEventListener("input", aplicarFiltros);

categorias[0]?.classList.add("ativa");

categorias.forEach((categoria) => {
    const selecionar = () => {
        categorias.forEach((item) => {
            item.classList.remove("ativa");
            item.setAttribute("aria-pressed", "false");
        });
        categoria.classList.add("ativa");
        categoria.setAttribute("aria-pressed", "true");
        categoriaSelecionada = categoria.dataset.categoria || "";
        aplicarFiltros();
        document.getElementById("restaurantes")?.scrollIntoView({ behavior: "smooth" });
    };

    categoria.addEventListener("click", selecionar);
});

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
    categoriaSelecionada = "";
    filtros.abertoAgora = false;
    filtros.ordenarPorTaxa = false;
    filtroAberto?.classList.remove("active");
    ordenarTaxa?.classList.remove("active");
    if (pesquisa) pesquisa.value = "";
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
    const conteudo = Promise.allSettled([carregarEmpresas(), carregarDestaques()]);
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
    const busca = document.getElementById('campoBusca');
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
