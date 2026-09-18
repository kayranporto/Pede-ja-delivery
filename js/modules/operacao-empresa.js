"use strict";

(() => {
    const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    let loja = null;
    let horarios = [];
    let pausas = [];
    let regioes = [];
    function atualizarCampoBairro() {
        const cidadeInteira = document.getElementById("regiaoCidadeInteira")?.checked;
        const bairro = document.getElementById("regiaoBairro");
        if (!bairro) return;
        bairro.disabled = Boolean(cidadeInteira);
        bairro.required = !cidadeInteira;
        bairro.placeholder = cidadeInteira ? "Todos os bairros" : "Ex.: Centro";
    }
    document.getElementById("regiaoCidadeInteira")?.addEventListener("change", atualizarCampoBairro);
    document.getElementById("regiaoForm")?.addEventListener("reset", () => setTimeout(atualizarCampoBairro, 0));

    let cancelamentos = [];

    const $ = (id) => document.getElementById(id);
    const criar = (tag, classe, texto) => {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };
    const dataBr = (valor) => new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const erro = (mensagem) => window.AppToast?.("Não foi possível concluir", App.mensagemErro(mensagem), "error") || alert(App.mensagemErro(mensagem));
    const sucesso = (titulo, mensagem) => window.AppToast?.(titulo, mensagem, "success");

    function renderizarHorarios() {
        const mapa = new Map(horarios.map((item) => [Number(item.dia_semana), item]));
        $("horariosEmpresa").replaceChildren(...DIAS.map((nome, dia) => {
            const atual = mapa.get(dia) || { dia_semana: dia, abre: "08:00:00", fecha: "22:00:00", ativo: dia !== 0 };
            const linha = criar("div", "hours-row");
            linha.dataset.dia = String(dia);
            const label = criar("label");
            const ativo = document.createElement("input");
            ativo.type = "checkbox";
            ativo.checked = atual.ativo !== false;
            ativo.dataset.campo = "ativo";
            label.append(ativo, document.createTextNode(nome));
            const abre = document.createElement("input");
            abre.type = "time";
            abre.value = String(atual.abre || "08:00").slice(0, 5);
            abre.dataset.campo = "abre";
            abre.setAttribute("aria-label", `Abertura de ${nome}`);
            const fecha = document.createElement("input");
            fecha.type = "time";
            fecha.value = String(atual.fecha || "22:00").slice(0, 5);
            fecha.dataset.campo = "fecha";
            fecha.setAttribute("aria-label", `Fechamento de ${nome}`);
            linha.append(label, abre, fecha);
            return linha;
        }));
    }

    function renderizarPausas() {
        const container = $("pausasEmpresa");
        container.replaceChildren();
        const futuras = pausas.filter((item) => new Date(item.fim).getTime() > Date.now());
        if (!futuras.length) return container.append(criar("p", "empty", "Nenhuma pausa futura programada."));
        futuras.forEach((pausa) => {
            const item = criar("article", "operation-item");
            const texto = criar("div");
            texto.append(criar("strong", "", pausa.motivo || "Pausa da operação"), criar("small", "", `${dataBr(pausa.inicio)} até ${dataBr(pausa.fim)}`));
            const acoes = criar("div", "operation-actions");
            const remover = criar("button", "remove", "Excluir");
            remover.type = "button";
            remover.addEventListener("click", async () => {
                remover.disabled = true;
                try {
                    await window.DeliveryAPI.empresaOperacaoAcao({ acao: "pausa_remover", empresa_id: String(loja.id), id: pausa.id, unidade_id: null });
                } catch (error) { remover.disabled = false; return erro(error); }
                pausas = pausas.filter((atual) => atual.id !== pausa.id);
                renderizarPausas();
                atualizarDisponibilidade();
            });
            acoes.append(remover);
            item.append(texto, acoes);
            container.append(item);
        });
    }

    function renderizarRegioes() {
        const container = $("regioesEmpresa");
        container.replaceChildren();
        if (!regioes.length) return container.append(criar("p", "empty", "Sem regiões específicas: serão usadas as configurações gerais da loja."));
        regioes.forEach((regiao) => {
            const item = criar("article", "region-item");
            const texto = criar("div");
            texto.append(
                criar("strong", "", `${regiao.bairro === "*" ? "Todos os bairros" : regiao.bairro} • ${regiao.cidade}/${regiao.uf}`),
                criar("small", "", `${App.dinheiro(regiao.taxa_entrega)} de entrega • mínimo ${App.dinheiro(regiao.pedido_minimo)} • ${regiao.tempo_min}–${regiao.tempo_max} min`)
            );
            const acoes = criar("div", "operation-actions");
            const alternar = criar("button", regiao.ativo ? "approve" : "", regiao.ativo ? "Ativa" : "Pausada");
            alternar.type = "button";
            alternar.addEventListener("click", async () => {
                try {
                    await window.DeliveryAPI.empresaOperacaoAcao({ acao: "regiao_toggle", empresa_id: String(loja.id), id: regiao.id, ativo: !regiao.ativo, unidade_id: regiao.unidade_id || null });
                } catch (error) { return erro(error); }
                regiao.ativo = !regiao.ativo;
                renderizarRegioes();
            });
            const remover = criar("button", "remove", "Excluir");
            remover.type = "button";
            remover.addEventListener("click", async () => {
                const confirmar = window.AppConfirm ? await AppConfirm({ titulo: "Excluir região", mensagem: `Remover a entrega para ${regiao.bairro === "*" ? "Todos os bairros" : regiao.bairro}?`, confirmar: "Excluir" }) : confirm("Excluir esta região?");
                if (!confirmar) return;
                try {
                    await window.DeliveryAPI.empresaOperacaoAcao({ acao: "regiao_remover", empresa_id: String(loja.id), id: regiao.id, unidade_id: regiao.unidade_id || null });
                } catch (error) { return erro(error); }
                regioes = regioes.filter((atual) => atual.id !== regiao.id);
                renderizarRegioes();
            });
            acoes.append(alternar, remover);
            item.append(texto, acoes);
            container.append(item);
        });
    }

    async function decidirCancelamento(pedido, aprovar, botao) {
        const confirmar = window.AppConfirm ? await AppConfirm({
            titulo: aprovar ? "Aprovar cancelamento" : "Recusar cancelamento",
            mensagem: aprovar ? "O pedido será cancelado e o estoque reservado será devolvido." : "O pedido continuará em andamento e o cliente será avisado.",
            confirmar: aprovar ? "Aprovar" : "Recusar"
        }) : confirm(aprovar ? "Aprovar o cancelamento?" : "Recusar o cancelamento?");
        if (!confirmar) return;
        App.definirCarregando(botao, true, "Salvando...");
        let resultado;
        try {
            resultado = await window.DeliveryAPI.empresaOperacaoAcao({ acao: "cancelamento", empresa_id: String(loja.id), pedido_id: pedido.id, aprovar, observacao: null });
        } catch (error) {
            App.definirCarregando(botao, false);
            return erro(error);
        }
        App.definirCarregando(botao, false);
        if (!resultado) return erro("A API não retornou confirmação do cancelamento.");
        cancelamentos = cancelamentos.filter((item) => item.id !== pedido.id);
        renderizarCancelamentos();
        carregarFinanceiro();
        sucesso("Solicitação atualizada", aprovar ? "O pedido foi cancelado." : "O pedido continuará em andamento.");
    }

    function renderizarCancelamentos() {
        const container = $("cancelamentosEmpresa");
        container.replaceChildren();
        if (!cancelamentos.length) return container.append(criar("p", "empty", "Nenhuma solicitação pendente."));
        cancelamentos.forEach((pedido) => {
            const item = criar("article", "operation-item");
            const texto = criar("div");
            texto.append(criar("strong", "", `Pedido #${pedido.numero || String(pedido.id).slice(0, 8)} • ${pedido.cliente_nome || "Cliente"}`), criar("small", "", pedido.cancelamento_motivo || "Motivo não informado"));
            const acoes = criar("div", "operation-actions");
            const aprovar = criar("button", "approve", "Aprovar");
            const recusar = criar("button", "reject", "Recusar");
            aprovar.type = recusar.type = "button";
            aprovar.addEventListener("click", () => decidirCancelamento(pedido, true, aprovar));
            recusar.addEventListener("click", () => decidirCancelamento(pedido, false, recusar));
            acoes.append(aprovar, recusar);
            item.append(texto, acoes);
            container.append(item);
        });
    }

    async function atualizarDisponibilidade() {
        let data;
        try {
            const resposta = await window.DeliveryAPI.empresaOperacao(loja.id);
            data = resposta?.disponibilidade;
        } catch (error) {
            const status = $("operacaoStatus");
            status.textContent = "● Status indisponível";
            status.classList.add("closed");
            return;
        }
        const status = $("operacaoStatus");
        status.textContent = data?.aberto ? "● Aberta pelo horário" : "● Fechada pelo horário";
        status.classList.toggle("closed", !data?.aberto);
    }

    async function carregarFinanceiro() {
        const dias = Number($("financeiroPeriodo").value || 30);
        let data;
        try {
            const resposta = await window.DeliveryAPI.empresaOperacao(loja.id, "", true, dias);
            data = resposta?.financeiro;
        } catch (error) {
            return erro(error);
        }
        if (!data) return erro("O financeiro não retornou dados.");
        $("financeBruto").textContent = App.dinheiro(data?.bruto);
        $("financeTaxa").textContent = App.dinheiro(data?.taxa_plataforma);
        $("financeLiquido").textContent = App.dinheiro(data?.liquido);
        $("financePendente").textContent = App.dinheiro(data?.online_pendente);
        $("financeReembolsos").textContent = String(data?.reembolsos_pendentes || 0);
        $("financeEntregues").textContent = String(data?.pedidos_entregues || 0);
        $("financeNota").textContent = `Estimativa dos últimos ${dias} dias, descontando ${Number(data?.taxa_percentual || 0).toLocaleString("pt-BR")}% de taxa da plataforma.`;
    }

    async function carregarDados() {
        const { data: { user } } = await window.db.auth.getUser();
        if (!user) return;
        let empresaAtual;
        try {
            const acessos = await window.DeliveryAPI.request("/v1/empresa/acesso");
            empresaAtual = (Array.isArray(acessos) ? acessos : []).find((item) => item.proprietario === true) || null;
        } catch (error) {
            return erro(error);
        }
        if (!empresaAtual?.empresa_id) return;
        try {
            const painel = await window.DeliveryAPI.empresaPainel(empresaAtual.empresa_id);
            loja = painel?.empresa || null;
        } catch (error) {
            return erro(error);
        }
        if (!loja) return;
        $("regiaoCidade").value = loja.cidade_atendimento || "";
        $("regiaoUf").value = loja.uf_atendimento || "";
        $("regiaoMinimo").value = Number(loja.pedido_minimo || 0).toFixed(2);
        let dados;
        try {
            dados = await window.DeliveryAPI.empresaOperacao(loja.id, "", false);
        } catch (error) {
            return erro(error);
        }
        horarios = dados?.horarios || [];
        pausas = dados?.pausas || [];
        regioes = dados?.regioes || [];
        cancelamentos = dados?.cancelamentos || [];
        const fidelidade = dados?.fidelidade || {};
        $("fidelidadeAtiva").checked = fidelidade.ativo === true;
        $("pontosPorReal").value = Number(fidelidade.pontos_por_real || 1);
        $("pontosBeneficio").value = Number(fidelidade.pontos_para_beneficio || 500);
        $("valorBeneficio").value = Number(fidelidade.valor_beneficio || 20);
        renderizarHorarios(); renderizarPausas(); renderizarRegioes(); renderizarCancelamentos();
        await Promise.all([atualizarDisponibilidade(), carregarFinanceiro()]);
    }

    $("horariosForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const registros = [...$("horariosEmpresa").querySelectorAll(".hours-row")].map((linha) => ({
            empresa_id: String(loja.id), dia_semana: Number(linha.dataset.dia), ativo: linha.querySelector("[data-campo='ativo']").checked,
            abre: linha.querySelector("[data-campo='abre']").value, fecha: linha.querySelector("[data-campo='fecha']").value, updated_at: new Date().toISOString()
        }));
        const botao = event.currentTarget.querySelector("button[type='submit']"); App.definirCarregando(botao, true, "Salvando...");
        let data;
        try {
            data = await window.DeliveryAPI.empresaOperacaoAcao({ acao: "horarios", empresa_id: String(loja.id), unidade_id: null, registros: registros.map((registro) => ({ ...registro, unidade_id: null })) });
        } catch (error) {
            App.definirCarregando(botao, false);
            return erro(error);
        }
        App.definirCarregando(botao, false);
        horarios = data || registros; sucesso("Horários salvos", "A disponibilidade já segue a nova agenda."); atualizarDisponibilidade();
    });

    $("pausaForm")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const inicio = new Date($("pausaInicio").value); const fim = new Date($("pausaFim").value);
        if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime()) || fim <= inicio) return erro("Informe um intervalo válido para a pausa.");
        let data;
        try {
            data = await window.DeliveryAPI.empresaOperacaoAcao({ acao: "pausa_criar", empresa_id: String(loja.id), unidade_id: null, inicio: inicio.toISOString(), fim: fim.toISOString(), motivo: $("pausaMotivo").value.trim() || null });
        } catch (error) { return erro(error); }
        pausas.push(data); event.currentTarget.reset(); renderizarPausas(); atualizarDisponibilidade(); sucesso("Pausa programada", "A loja ficará indisponível no período informado.");
    });

    $("regiaoForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = { empresa_id: String(loja.id), bairro: $("regiaoCidadeInteira")?.checked ? "*" : $("regiaoBairro").value.trim(), cidade: $("regiaoCidade").value.trim(), uf: $("regiaoUf").value.trim().toUpperCase(), taxa_entrega: Number($("regiaoTaxa").value), pedido_minimo: Number($("regiaoMinimo").value), tempo_min: Number($("regiaoTempoMin").value), tempo_max: Number($("regiaoTempoMax").value), ativo: true };
        if (!payload.bairro || !payload.cidade || !/^[A-Z]{2}$/.test(payload.uf) || payload.tempo_max < payload.tempo_min) return erro("Revise os dados da região.");
        let data;
        try {
            data = await window.DeliveryAPI.empresaOperacaoAcao({ acao: "regiao_criar", ...payload, unidade_id: payload.unidade_id || null });
        } catch (error) { return erro(error); }
        regioes.push(data); $("regiaoBairro").value = ""; renderizarRegioes(); sucesso("Região adicionada", "O checkout já usará a nova taxa e previsão.");
    });

    $("fidelidadeForm")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const payload = { empresa_id: String(loja.id), ativo: $("fidelidadeAtiva").checked, pontos_por_real: Number($("pontosPorReal").value), pontos_para_beneficio: Number($("pontosBeneficio").value), valor_beneficio: Number($("valorBeneficio").value), updated_at: new Date().toISOString() };
        try {
            await window.DeliveryAPI.empresaOperacaoAcao({ acao: "fidelidade", ...payload });
        } catch (error) { return erro(error); }
        sucesso("Fidelidade atualizada", payload.ativo ? "Os próximos pedidos entregues gerarão pontos." : "O programa foi pausado.");
    });

    $("financeiroPeriodo")?.addEventListener("change", carregarFinanceiro);
    carregarDados().catch(erro);
})();
