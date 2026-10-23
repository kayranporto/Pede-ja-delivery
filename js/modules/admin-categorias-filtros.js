"use strict";

(() => {
    const TABELA = "categorias_filtros_home";
    let categorias = [];
    let inicializado = false;
    let salvando = false;
    const formulario = document.getElementById("filtroCategoriaForm");
    const campoId = document.getElementById("filtroCategoriaId");
    const campoNome = document.getElementById("filtroCategoriaNome");
    const campoIcone = document.getElementById("filtroCategoriaIcone");
    const campoOrdem = document.getElementById("filtroCategoriaOrdem");
    const botaoSalvar = document.getElementById("filtroCategoriaSalvar");
    const botaoCancelar = document.getElementById("filtroCategoriaCancelar");
    const botaoAtualizar = document.getElementById("atualizarCategoriasFiltrosAdmin");
    const lista = document.getElementById("adminCategoriasFiltros");
    const resumo = document.getElementById("resumoCategoriasFiltros");
    const feedback = document.getElementById("filtroCategoriaFeedback");
    const tituloFormulario = document.getElementById("filtroCategoriaFormTitulo");

    function normalizar(valor) {
        return window.CategoriasFiltros?.normalizar
            ? window.CategoriasFiltros.normalizar(valor)
            : String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    }
    function mensagemErro(erro) {
        const mensagem = String(erro?.message || "Falha inesperada ao salvar.");
        if (/duplicate key|unique constraint|categorias_filtros_home_nome_unico/i.test(mensagem)) return "Já existe uma categoria com esse nome. Escolha outro nome.";
        if (/row-level security|permission denied|42501|not allowed/i.test(mensagem)) return "Sua conta não tem permissão para gerenciar os filtros da Home.";
        return mensagem;
    }
    function mostrarFeedback(mensagem, tipo = "info") {
        if (!feedback) return;
        feedback.textContent = mensagem;
        feedback.dataset.tipo = tipo;
    }
    function redefinirFormulario() {
        formulario?.reset();
        if (campoId) campoId.value = "";
        if (campoIcone) campoIcone.value = "🍽️";
        if (campoOrdem) campoOrdem.value = String((categorias.length + 1) * 10);
        if (tituloFormulario) tituloFormulario.textContent = "Adicionar categoria";
        if (botaoSalvar) botaoSalvar.textContent = "Adicionar categoria";
        if (botaoCancelar) botaoCancelar.hidden = true;
    }
    function iniciarEdicao(categoria) {
        if (!campoId || !campoNome || !campoIcone || !campoOrdem) return;
        campoId.value = categoria.id;
        campoNome.value = categoria.nome || "";
        campoIcone.value = categoria.icone || "🍽️";
        campoOrdem.value = String(Number(categoria.ordem) || 0);
        tituloFormulario.textContent = "Editar categoria";
        botaoSalvar.textContent = "Salvar alterações";
        botaoCancelar.hidden = false;
        mostrarFeedback("A categoria selecionada está em edição.", "info");
        campoNome.focus();
        formulario.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function criarBotao(rotulo, classe, acao, ariaLabel) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = classe;
        botao.textContent = rotulo;
        botao.setAttribute("aria-label", ariaLabel);
        botao.addEventListener("click", acao);
        return botao;
    }
    function renderizarLista() {
        if (!lista || !resumo) return;
        lista.replaceChildren();
        resumo.textContent = categorias.length === 1 ? "1 categoria disponível" : categorias.length + " categorias disponíveis";
        if (!categorias.length) {
            const vazio = document.createElement("p");
            vazio.className = "admin-filter-category-empty";
            vazio.textContent = "Nenhuma categoria cadastrada. Use o formulário para adicionar a primeira.";
            lista.append(vazio);
            return;
        }
        categorias.forEach((categoria) => {
            const linha = document.createElement("div");
            linha.className = "admin-filter-category-row";
            const icone = document.createElement("span");
            icone.className = "admin-filter-category-emoji";
            icone.setAttribute("aria-hidden", "true");
            icone.textContent = categoria.icone || "🍽️";
            const texto = document.createElement("div");
            texto.className = "admin-filter-category-info";
            const nome = document.createElement("strong");
            nome.textContent = categoria.nome;
            const detalhe = document.createElement("small");
            detalhe.textContent = "Posição " + (Number(categoria.ordem) || 0);
            texto.append(nome, detalhe);
            const acoes = document.createElement("div");
            acoes.className = "admin-filter-category-actions";
            acoes.append(
                criarBotao("Editar", "admin-secondary-button", () => iniciarEdicao(categoria), "Editar categoria " + categoria.nome),
                criarBotao("Excluir", "admin-danger-button", () => void excluirCategoria(categoria), "Excluir categoria " + categoria.nome)
            );
            linha.append(icone, texto, acoes);
            lista.append(linha);
        });
    }
    async function carregarCategorias() {
        if (!window.DeliveryAPI?.request) throw new Error("Não foi possível conectar à API.");
        const data = await window.DeliveryAPI.request("/v1/categorias-filtros");
        categorias = Array.isArray(data) ? data : [];
        renderizarLista();
    }
    async function excluirCategoria(categoria) {
        const mensagem = "Excluir o filtro “" + categoria.nome + "”? Os restaurantes não serão apagados, mas essa categoria deixará de aparecer na página inicial.";
        if (!window.confirm(mensagem)) return;
        try {
            await window.DeliveryAPI.request("/v1/admin/categorias-filtros/" + encodeURIComponent(String(categoria.id)), { method: "DELETE" });
            if (campoId?.value === String(categoria.id)) redefinirFormulario();
            await carregarCategorias();
            mostrarFeedback("Categoria excluída. A lista de filtros foi atualizada.", "success");
        } catch (erro) {
            mostrarFeedback("Não foi possível excluir a categoria: " + mensagemErro(erro), "error");
        }
    }
    async function salvarCategoria(evento) {
        evento.preventDefault();
        if (salvando || !formulario || !campoNome || !campoIcone || !campoOrdem) return;
        const nome = campoNome.value.trim().replace(/\s+/g, " ");
        const icone = campoIcone.value.trim();
        const ordem = Number(campoOrdem.value);
        if (!nome || !icone || !Number.isInteger(ordem) || ordem < 0 || ordem > 10000) {
            mostrarFeedback("Informe nome, emoji/ícone e uma posição válida.", "error");
            return;
        }
        const id = campoId?.value || "";
        const atual = categorias.find((categoria) => String(categoria.id) === String(id));
        if (categorias.some((categoria) => String(categoria.id) !== String(id) && normalizar(categoria.nome) === normalizar(nome))) {
            mostrarFeedback("Já existe uma categoria com esse nome.", "error");
            return;
        }
        const aliases = Array.isArray(atual?.aliases) ? [...atual.aliases] : [];
        if (atual && normalizar(atual.nome) !== normalizar(nome)) aliases.push(atual.nome);
        const aliasUnicos = [...new Map(aliases.map((alias) => [normalizar(alias), String(alias).trim()])).entries()]
            .filter(([normalizado, valor]) => normalizado && normalizado !== normalizar(nome) && valor)
            .map(([, valor]) => valor);
        const payload = { nome, icone, ordem, aliases: aliasUnicos, updated_at: new Date().toISOString() };
        salvando = true;
        if (botaoSalvar) botaoSalvar.disabled = true;
        try {
            await window.DeliveryAPI.request(
                atual ? "/v1/admin/categorias-filtros/" + encodeURIComponent(String(atual.id)) : "/v1/admin/categorias-filtros",
                { method: atual ? "PATCH" : "POST", body: JSON.stringify(payload) }
            );
            redefinirFormulario();
            await carregarCategorias();
            mostrarFeedback(atual ? "Categoria atualizada com sucesso." : "Categoria adicionada com sucesso.", "success");
        } catch (erro) {
            mostrarFeedback("Não foi possível salvar a categoria: " + mensagemErro(erro), "error");
        } finally {
            salvando = false;
            if (botaoSalvar) botaoSalvar.disabled = false;
        }
    }
    async function inicializar() {
        if (inicializado || !formulario || !lista) return;
        if (typeof window.__ADMIN_PODE_ACESSAR_SECAO__ === "function"
            && !window.__ADMIN_PODE_ACESSAR_SECAO__("categorias_filtros")) return;
        inicializado = true;
        formulario.addEventListener("submit", salvarCategoria);
        botaoCancelar?.addEventListener("click", () => {
            redefinirFormulario();
            mostrarFeedback("Edição cancelada.", "info");
        });
        botaoAtualizar?.addEventListener("click", async () => {
            botaoAtualizar.disabled = true;
            try {
                await carregarCategorias();
                mostrarFeedback("Lista atualizada.", "success");
            } catch (erro) {
                mostrarFeedback("Não foi possível atualizar: " + mensagemErro(erro), "error");
            } finally {
                botaoAtualizar.disabled = false;
            }
        });
        try {
            await carregarCategorias();
            redefinirFormulario();
        } catch (erro) {
            lista.textContent = "Não foi possível carregar categorias: " + mensagemErro(erro);
            mostrarFeedback("Verifique a conexão e a permissão administrativa.", "error");
        }
    }
    window.inicializarCategoriasFiltrosAdmin = inicializar;
})();
