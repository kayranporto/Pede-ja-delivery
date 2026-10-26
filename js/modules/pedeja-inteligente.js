"use strict";

(() => {
    const section = document.getElementById("pedejaInteligente");
    const lista = document.getElementById("pedejaInteligenteLista");
    const categoriaInput = document.getElementById("inteligenteCategoria");
    const orcamentoInput = document.getElementById("inteligenteOrcamento");
    const mensagem = document.getElementById("inteligenteMensagem");
    if (!section || !lista || !window.DeliveryAPI) return;

    const PREF_KEY = "pedeja-inteligente-preferencias-v1";
    const normalizarTexto = (valor) => String(valor || "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const dinheiro = (valor) => Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency", currency: "BRL"
    });

    function lerPreferencias() {
        try {
            const salvo = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
            return {
                categoria: typeof salvo.categoria === "string" ? salvo.categoria : "",
                orcamento: ["30", "60", "100", "0"].includes(String(salvo.orcamento)) ? String(salvo.orcamento) : "0"
            };
        } catch {
            return { categoria: "", orcamento: "0" };
        }
    }

    function salvarPreferencias() {
        try {
            localStorage.setItem(PREF_KEY, JSON.stringify({ categoria: categoriaInput.value, orcamento: orcamentoInput.value }));
        } catch { /* A preferência ainda vale durante a sessão atual. */ }
        void carregarSugestoes();
    }

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function periodoAtual() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 11) return { nome: "café da manhã", categorias: ["cafe", "padaria", "doces", "bebidas"] };
        if (hora >= 11 && hora < 15) return { nome: "almoço", categorias: ["brasileira", "prato feito", "marmita", "salada"] };
        if (hora >= 15 && hora < 18) return { nome: "lanche da tarde", categorias: ["lanches", "doces", "sorvete", "bebidas"] };
        return { nome: "jantar", categorias: ["pizza", "hamburguer", "sushi", "japonesa", "massas"] };
    }

    async function carregarSugestoes() {
        lista.replaceChildren(criar("p", "inteligente-carregando", "Encontrando opções para você…"));
        try {
            const restaurantes = await window.DeliveryAPI.restaurantes({ limite: 50 });
            let pedidos = [];
            let autenticado = false;
            try {
                const sessao = await window.db?.auth?.getSession();
                autenticado = Boolean(sessao?.data?.session?.user?.id);
                if (autenticado) pedidos = await window.DeliveryAPI.meusPedidos();
            } catch {
                pedidos = [];
            }

            const categoriaEscolhida = categoriaInput.value;
            const teto = orcamentoInput.value === "0" ? Infinity : Number(orcamentoInput.value);
            const periodo = periodoAtual();
            const repeticoes = new Map();

            (Array.isArray(pedidos) ? pedidos : []).forEach((pedido) => {
                if (pedido.status === "cancelado") return;
                const id = String(pedido.empresa_id || "");
                if (id) repeticoes.set(id, (repeticoes.get(id) || 0) + 1);
            });

            const resultados = (Array.isArray(restaurantes) ? restaurantes : [])
                .filter((r) => r?.id && r?.nome && r.status !== false)
                .filter((r) => Number(r.pedido_minimo || 0) + Number(r.taxa_entrega || 0) <= teto)
                .map((r) => {
                    const categoria = normalizarTexto([r.categoria, r.tipo].filter(Boolean).join(" "));
                    let pontuacao = Math.min(repeticoes.get(String(r.id)) || 0, 5) * 5;
                    if (categoriaEscolhida && categoria.includes(normalizarTexto(categoriaEscolhida))) pontuacao += 8;
                    if (periodo.categorias.some((termo) => categoria.includes(normalizarTexto(termo)))) pontuacao += 2;
                    if (r.abertaAgora === true) pontuacao += 2;
                    const avaliacao = Number(r.nota_media || 0);
                    if (avaliacao > 0) pontuacao += Math.min(avaliacao, 5) * 0.5;
                    pontuacao -= Math.min(Number(r.taxa_entrega || 0), 30) / 10;
                    return { ...r, pontuacao, anteriores: repeticoes.get(String(r.id)) || 0 };
                })
                .sort((a, b) => b.pontuacao - a.pontuacao || Number(a.taxa_entrega || 0) - Number(b.taxa_entrega || 0))
                .slice(0, 4);

            lista.replaceChildren();
            if (!resultados.length) {
                lista.append(criar("p", "inteligente-vazio", "Não encontramos opções dentro desse orçamento. Tente aumentar o limite ou escolher outra categoria."));
                mensagem.textContent = "Ajuste os filtros para encontrar outras opções.";
                return;
            }

            resultados.forEach((r) => {
                const card = criar("article", "inteligente-card");
                const img = criar("img", "inteligente-imagem");
                img.src = r.logo || r.banner || "assets/logo-restaurante.svg";
                img.alt = r.logo || r.banner ? `Imagem de ${r.nome}` : "";
                img.loading = "lazy";
                img.addEventListener("error", () => { img.src = "assets/logo-restaurante.svg"; }, { once: true });
                const corpo = criar("div", "inteligente-corpo");
                corpo.append(criar("h3", "", r.nome));
                const categoria = [r.categoria, r.tipo].filter(Boolean).join(" · ");
                if (categoria) corpo.append(criar("p", "inteligente-categoria", categoria));
                const motivo = r.anteriores
                    ? "Você já pediu aqui"
                    : (categoriaEscolhida && normalizarTexto(categoria).includes(normalizarTexto(categoriaEscolhida))
                        ? "Combina com sua preferência" : `Sugestão para ${periodo.nome}`);
                corpo.append(criar("p", "inteligente-motivo", motivo));
                corpo.append(criar("p", "inteligente-detalhes", `Entrega ${Number(r.taxa_entrega || 0) > 0 ? dinheiro(r.taxa_entrega) : "grátis"} · Pedido mínimo ${dinheiro(r.pedido_minimo)}`));
                const link = criar("a", "inteligente-link", "Ver cardápio →");
                link.href = `html/restaurante.html?id=${encodeURIComponent(r.id)}`;
                corpo.append(link);
                card.append(img, corpo);
                lista.append(card);
            });

            mensagem.textContent = autenticado && pedidos.length
                ? "Sugestões combinam seu histórico de pedidos, suas preferências, o orçamento e o horário."
                : `Sugestões para ${periodo.nome}, considerando a categoria e o orçamento escolhidos.`;
        } catch (erro) {
            console.warn("Sugestões inteligentes indisponíveis:", erro);
            lista.replaceChildren(criar("p", "inteligente-vazio", "Não foi possível carregar as sugestões agora. Você pode explorar os restaurantes normalmente."));
            mensagem.textContent = "Sugestões temporariamente indisponíveis.";
        }
    }

    const preferencias = lerPreferencias();
    categoriaInput.value = preferencias.categoria;
    orcamentoInput.value = preferencias.orcamento;
    categoriaInput.addEventListener("change", salvarPreferencias);
    orcamentoInput.addEventListener("change", salvarPreferencias);
    void carregarSugestoes();
})();