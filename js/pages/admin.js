"use strict";

let adminEmpresas = [];
let adminUsuarios = [];
let adminPedidos = [];
let adminCupons = [];
let adminLogs = [];
let adminAuditoria = [];
let adminRelatorio = null;
let adminInteligencia = { produtos: [], clientes_recorrentes: [], seguranca: {} };\nlet adminPlanosPlataforma = [];\nlet adminAssinaturas = [];
let canalAdmin = null;
let recarregarTimer = null;
let carregandoDados = false;
let paginaPedidos = 1;
const pedidosPorPagina = 10;
const avisosCompatibilidadeAdmin = new Set();

const modal = document.getElementById("adminModal");
const modalTitulo = document.getElementById("adminModalTitle");
const modalKicker = document.getElementById("adminModalKicker");
const modalCorpo = document.getElementById("adminModalBody");
const modalAcoes = document.getElementById("adminModalActions");
let focoAntesModal = null;
let resolverModal = null;

function elemento(tag, classe, texto) {
    const item = document.createElement(tag);
    if (classe) item.className = classe;
    if (texto !== undefined) item.textContent = texto;
    return item;
}

function dataCurta(valor) {
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) ? data.toLocaleDateString("pt-BR") : "—";
}

function dataHora(valor) {
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) ? data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function paraDataLocal(valor) {
    if (!valor) return "";
    const data = new Date(valor);
    if (!Number.isFinite(data.getTime())) return "";
    const deslocamento = data.getTimezoneOffset() * 60000;
    return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16);
}

function vazioTabela(colunas, texto) {
    const tr = document.createElement("tr");
    const td = elemento("td", "", texto);
    td.colSpan = colunas;
    tr.append(td);
    return tr;
}

function nomeEmpresa(id) {
    return adminEmpresas.find((empresa) => String(empresa.id) === String(id))?.nome || "Plataforma";
}

function statusLegivel(status) {
    return ({ recebido: "Recebido", preparando: "Preparando", saiu_para_entrega: "Saiu para entrega", entregue: "Entregue", cancelado: "Cancelado" })[status] || String(status || "Recebido").replaceAll("_", " ");
}

function anunciar(mensagem) {
    document.getElementById("adminLive").textContent = mensagem;
}

function mostrarErro(titulo, erro) {
    const mensagem = App.mensagemErro(erro);
    if (window.AppToast) window.AppToast(titulo, mensagem, "error");
    else alert(`${titulo}: ${mensagem}`);
    anunciar(`${titulo}: ${mensagem}`);
}

function recursoNaoMigrado(erro, ...nomes) {
    if (!erro) return false;
    const mensagem = `${erro.code || ""} ${erro.message || ""} ${erro.details || ""}`.toLowerCase();
    return ["42703", "42p01", "pgrst202", "pgrst204", "pgrst205", "does not exist", "could not find"].some((trecho) => mensagem.includes(trecho))
        && (!nomes.length || nomes.some((nome) => mensagem.includes(String(nome).toLowerCase())));
}

function registrarCompatibilidade(recurso) {
    avisosCompatibilidadeAdmin.add(recurso);
}

async function consultarEmpresasAdmin() {
    try { const snapshot = await window.DeliveryAPI.adminDashboard(); return { data: snapshot?.empresas || [], error: null }; }
    catch (error) { return { data: [], error }; }
}

async function consultarPedidosAdmin() {
    try {
        const snapshot = await window.DeliveryAPI.adminDashboard();
        const data = (snapshot?.pedidos || []).map((pedido) => ({ pagamento_status: "pendente", pagamento_modalidade: "na_entrega", ...pedido }));
        return { data, error: null };
    } catch (error) { return { data: [], error }; }
}

async function consultarCuponsAdmin() {
    try {
        const snapshot = await window.DeliveryAPI.adminDashboard();
        const data = (snapshot?.cupons || []).map((cupom) => ({
            empresa_id: null, tipo: "fixo", valor: cupom.desconto || 0, pedido_minimo: 0,
            usos: 0, limite_usos: null, primeiro_pedido: false, inicio: cupom.created_at,
            fim: cupom.validade || null, max_desconto: null, limite_por_usuario: 1, ...cupom
        }));
        return { data, error: null };
    } catch (error) { return { data: [], error }; }
}

function relatorioAdminLocal(dias) {
    const inicio = Date.now() - dias * 86400000;
    const pedidos = adminPedidos.filter((pedido) => new Date(pedido.created_at).getTime() >= inicio);
    const entregues = pedidos.filter((pedido) => pedido.status === "entregue");
    const tempos = entregues.map((pedido) => (new Date(pedido.updated_at).getTime() - new Date(pedido.created_at).getTime()) / 60000).filter((tempo) => Number.isFinite(tempo) && tempo >= 0);
    return {
        periodo_dias: dias,
        pedidos: pedidos.length,
        entregues: entregues.length,
        cancelados: pedidos.filter((pedido) => pedido.status === "cancelado").length,
        ticket_medio: entregues.length ? entregues.reduce((total, pedido) => total + Number(pedido.total || 0), 0) / entregues.length : 0,
        tempo_medio_minutos: tempos.length ? tempos.reduce((total, tempo) => total + tempo, 0) / tempos.length : 0,
        online: pedidos.filter((pedido) => pedido.pagamento_modalidade === "online").length
    };
}

function exibirAvisoCompatibilidade() {
    if (!avisosCompatibilidadeAdmin.size || document.getElementById("adminMigrationWarning")) return;
    const aviso = elemento("section", "admin-migration-warning");
    aviso.id = "adminMigrationWarning";
    const texto = elemento("div");
    texto.append(
        elemento("strong", "", "Banco aguardando atualização"),
        elemento("p", "", "O painel está em modo compatibilidade. Execute as migrações 008, 009 e 010 no Supabase para liberar todas as funções.")
    );
    aviso.append(elemento("span", "", "!"), texto);
    document.querySelector(".admin-main").prepend(aviso);
    const saude = document.querySelector(".admin-health");
    saude?.classList.add("warning");
    const status = saude?.querySelector("strong");
    if (status) status.textContent = "Atualização pendente";
}

function botao(texto, classe = "admin-secondary-button", tipo = "button") {
    const item = elemento("button", classe, texto);
    item.type = tipo;
    return item;
}

function abrirModal({ titulo, kicker = "ADMINISTRAÇÃO", corpo, acoes = [] }) {
    focoAntesModal = document.activeElement;
    modalTitulo.textContent = titulo;
    modalKicker.textContent = kicker;
    modalCorpo.replaceChildren(corpo);
    modalAcoes.replaceChildren(...acoes);
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
    requestAnimationFrame(() => modal.querySelector("input,select,textarea,button:not([data-modal-close])")?.focus());
}

function fecharModal(resultado = false) {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
    modalCorpo.replaceChildren();
    modalAcoes.replaceChildren();
    const resolver = resolverModal;
    resolverModal = null;
    resolver?.(resultado);
    focoAntesModal?.focus?.();
}

function confirmarAcao(titulo, mensagem, textoConfirmar = "Confirmar", perigoso = false) {
    return new Promise((resolve) => {
        resolverModal = resolve;
        const corpo = elemento("div", "confirm-content");
        const texto = elemento("div");
        texto.append(elemento("strong", "", titulo), elemento("p", "", mensagem));
        corpo.append(elemento("span", "", perigoso ? "!" : "?"), texto);
        const cancelar = botao("Cancelar");
        cancelar.addEventListener("click", () => fecharModal(false));
        const confirmar = botao(textoConfirmar, perigoso ? "admin-primary-button danger" : "admin-primary-button");
        confirmar.addEventListener("click", () => fecharModal(true));
        abrirModal({ titulo, kicker: perigoso ? "ATENÇÃO" : "CONFIRMAÇÃO", corpo, acoes: [cancelar, confirmar] });
    });
}

function confirmarExclusaoRestaurante(empresa) {
    return new Promise((resolve) => {
        resolverModal = resolve;
        const corpo = elemento("div", "confirm-delete-content");
        corpo.append(
            elemento("p", "confirm-delete-warning", "Esta ação é irreversível. A loja e todos os seus pedidos, pagamentos, mensagens, avaliações, catálogo, imagens, equipe, unidades, assinatura, fidelidade e auditorias serão apagados permanentemente.")
        );
        const campo = elemento("label", "admin-form-field");
        const entrada = document.createElement("input");
        entrada.type = "text";
        entrada.autocomplete = "off";
        entrada.placeholder = empresa.nome;
        campo.append(
            elemento("span", "", `Digite “${empresa.nome}” para confirmar`),
            entrada
        );
        corpo.append(campo);

        const cancelar = botao("Cancelar");
        cancelar.addEventListener("click", () => fecharModal(false));
        const confirmar = botao("Apagar loja", "admin-primary-button danger");
        confirmar.disabled = true;
        entrada.addEventListener("input", () => {
            confirmar.disabled = entrada.value.trim().toLocaleLowerCase("pt-BR") !== empresa.nome.trim().toLocaleLowerCase("pt-BR");
        });
        confirmar.addEventListener("click", () => fecharModal(entrada.value.trim()));
        abrirModal({ titulo: `Apagar ${empresa.nome}`, kicker: "AÇÃO IRREVERSÍVEL", corpo, acoes: [cancelar, confirmar] });
    });
}

async function listarArquivosCatalogo(pastaRaiz) {
    const arquivos = [];
    const pastas = [pastaRaiz];
    while (pastas.length) {
        const pasta = pastas.shift();
        let offset = 0;
        while (true) {
            const { data, error } = await db.storage.from("catalogo").list(pasta, {
                limit: 1000,
                offset,
                sortBy: { column: "name", order: "asc" }
            });
            if (error) throw error;
            const itens = data || [];
            itens.forEach((item) => {
                const caminho = `${pasta}/${item.name}`;
                if (item.id) arquivos.push(caminho);
                else if (item.name && item.name !== ".emptyFolderPlaceholder") pastas.push(caminho);
            });
            if (itens.length < 1000) break;
            offset += itens.length;
        }
    }
    return arquivos;
}

async function apagarMidiasRestaurante(empresa) {
    const pasta = String(empresa.usuario_id || "").trim();
    if (!pasta) return;
    const arquivos = await listarArquivosCatalogo(pasta);
    for (let inicio = 0; inicio < arquivos.length; inicio += 1000) {
        const { error } = await db.storage.from("catalogo").remove(arquivos.slice(inicio, inicio + 1000));
        if (error) throw error;
    }
}

function campoFormulario(rotulo, id, tipo = "text", valor = "", opcoes = {}) {
    const caixa = elemento("label", `admin-form-field${opcoes.full ? " full" : ""}`);
    caixa.htmlFor = id;
    caixa.append(elemento("span", "", rotulo));
    let entrada;
    if (tipo === "select") {
        entrada = document.createElement("select");
        (opcoes.items || []).forEach(({ value, label }) => {
            const option = document.createElement("option"); option.value = value; option.textContent = label; entrada.append(option);
        });
    } else if (tipo === "textarea") {
        entrada = document.createElement("textarea");
    } else {
        entrada = document.createElement("input"); entrada.type = tipo;
    }
    entrada.id = id;
    entrada.value = valor ?? "";
    if (opcoes.required) entrada.required = true;
    if (opcoes.min !== undefined) entrada.min = opcoes.min;
    if (opcoes.max !== undefined) entrada.max = opcoes.max;
    if (opcoes.step !== undefined) entrada.step = opcoes.step;
    if (opcoes.placeholder) entrada.placeholder = opcoes.placeholder;
    caixa.append(entrada);
    return { caixa, entrada };
}

function campoCheck(rotulo, id, marcado = false) {
    const caixa = elemento("label", "admin-form-check");
    caixa.htmlFor = id;
    const entrada = document.createElement("input"); entrada.type = "checkbox"; entrada.id = id; entrada.checked = marcado;
    caixa.append(entrada, document.createTextNode(rotulo));
    return { caixa, entrada };
}

function atualizarMetricasAdmin() {
    const pendentes = adminEmpresas.filter((empresa) => empresa.publicado !== true).length;
    const bloqueados = adminUsuarios.filter((usuario) => usuario.bloqueado === true).length;
    const faturamento = adminPedidos.filter((pedido) => pedido.status === "entregue" && pedido.pagamento_status === "pago").reduce((soma, pedido) => soma + Number(pedido.total || 0), 0);
    document.getElementById("adminTotalEmpresas").textContent = String(adminEmpresas.length);
    document.getElementById("adminPendentes").textContent = String(pendentes);
    document.getElementById("pendentesMenu").textContent = String(pendentes);
    document.getElementById("adminTotalUsuarios").textContent = String(adminUsuarios.length);
    document.getElementById("adminBloqueados").textContent = String(bloqueados);
    document.getElementById("adminTotalPedidos").textContent = String(adminPedidos.length);
    document.getElementById("pedidosMenu").textContent = String(adminPedidos.length);
    document.getElementById("adminFaturamento").textContent = App.dinheiro(faturamento);
}

function renderizarAuditoria() {
    const container = document.getElementById("auditoriaAdmin");
    container.replaceChildren();
    if (!adminAuditoria.length) { container.append(elemento("p", "", "Nenhuma atividade administrativa registrada.")); return; }
    const nomes = {
        restaurante_atualizado: "Restaurante moderado", restaurante_editado: "Restaurante editado",
        usuario_bloqueio_atualizado: "Usuário atualizado", cupom_atualizado: "Cupom pausado/ativado",
        cupom_criado: "Cupom criado", cupom_editado: "Cupom editado", cupom_excluido: "Cupom excluído"
    };
    adminAuditoria.slice(0, 10).forEach((registro) => {
        const linha = elemento("div", "audit-row");
        linha.append(
            elemento("strong", "", nomes[registro.acao] || String(registro.acao || "Ação").replaceAll("_", " ")),
            elemento("span", "", registro.detalhes?.codigo || registro.detalhes?.nome || registro.alvo_id || "—"),
            elemento("time", "", dataHora(registro.created_at))
        );
        container.append(linha);
    });
}

function renderizarRelatorio() {
    if (!adminRelatorio) return;
    const total = Number(adminRelatorio.pedidos || 0);
    const cancelados = Number(adminRelatorio.cancelados || 0);
    document.getElementById("relatorioEntregues").textContent = String(adminRelatorio.entregues || 0);
    document.getElementById("relatorioCancelamento").textContent = `${total ? (cancelados / total * 100).toFixed(1) : "0.0"}%`;
    document.getElementById("relatorioTicket").textContent = App.dinheiro(adminRelatorio.ticket_medio);
    document.getElementById("relatorioTempo").textContent = `${Math.round(Number(adminRelatorio.tempo_medio_minutos || 0))} min`;
    document.getElementById("relatorioOnline").textContent = String(adminRelatorio.online || 0);

    const limite = Date.now() - Number(adminRelatorio.periodo_dias || 30) * 86400000;
    const grupos = new Map();
    adminPedidos.filter((pedido) => new Date(pedido.created_at).getTime() >= limite).forEach((pedido) => {
        const atual = grupos.get(String(pedido.empresa_id)) || { pedidos: 0, valor: 0 };
        atual.pedidos += 1;
        if (pedido.status === "entregue") atual.valor += Number(pedido.total || 0);
        grupos.set(String(pedido.empresa_id), atual);
    });
    const top = [...grupos.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);
    const topBox = document.getElementById("topRestaurantesAdmin"); topBox.replaceChildren();
    if (!top.length) topBox.append(elemento("p", "", "Sem dados no período."));
    top.forEach(([id, dados]) => { const row = elemento("div", "report-row"); row.append(elemento("span", "", nomeEmpresa(id)), elemento("strong", "", `${dados.pedidos} • ${App.dinheiro(dados.valor)}`)); topBox.append(row); });

    const produtosBox = document.getElementById("topProdutosAdmin"); produtosBox.replaceChildren();
    const produtosTop = adminInteligencia.produtos || [];
    if (!produtosTop.length) produtosBox.append(elemento("p", "", "Sem vendas concluídas no período."));
    produtosTop.slice(0, 6).forEach((produto) => { const row = elemento("div", "report-row"); row.append(elemento("span", "", `${produto.nome} • ${produto.empresa_nome}`), elemento("strong", "", `${produto.quantidade} un.`)); produtosBox.append(row); });

    const clientesBox = document.getElementById("clientesRecorrentesAdmin"); clientesBox.replaceChildren();
    const clientes = adminInteligencia.clientes_recorrentes || [];
    if (!clientes.length) clientesBox.append(elemento("p", "", "Nenhum cliente recorrente neste período."));
    clientes.slice(0, 6).forEach((cliente) => { const row = elemento("div", "report-row report-customer"); if (cliente.avatar_url) { const img = document.createElement("img"); img.src = cliente.avatar_url; img.alt = ""; row.append(img); } row.append(elemento("span", "", cliente.nome || "Cliente"), elemento("strong", "", `${cliente.pedidos} pedidos`)); clientesBox.append(row); });

    const segurancaBox = document.getElementById("segurancaLoginAdmin"); segurancaBox.replaceChildren();
    const seguranca = adminInteligencia.seguranca || {};
    const risco = Number(seguranca.emails_em_risco || 0);
    const resumoSeguranca = elemento("div", `security-summary ${risco ? "warning" : "ok"}`);
    resumoSeguranca.append(elemento("strong", "", risco ? `${risco} conta(s) em atenção` : "Nenhum bloqueio temporário"), elemento("span", "", `${Number(seguranca.falhas_24h || 0)} falha(s) de acesso nas últimas 24 horas`));
    segurancaBox.append(resumoSeguranca);

    const logsBox = document.getElementById("logsAdmin"); logsBox.replaceChildren();
    const logs = adminLogs.filter((log) => log.nivel === "error").slice(0, 6);
    if (!logs.length) logsBox.append(elemento("p", "", "Nenhum erro recente registrado."));
    logs.forEach((log) => { const row = elemento("div", "log-row"); row.append(elemento("strong", "", `${log.contexto} • ${log.pagina || "site"}`), elemento("span", "", log.mensagem), elemento("small", "", dataHora(log.created_at))); logsBox.append(row); });
    renderizarAuditoria();
}

async function carregarRelatorio() {
    const dias = Number(document.getElementById("periodoRelatorio").value || 30);
    try {
        const dados = await window.DeliveryAPI.adminRelatorios(dias);
        adminRelatorio = dados?.operacional || relatorioAdminLocal(dias);
        adminInteligencia = dados?.inteligencia || adminInteligencia;
        renderizarRelatorio();
    } catch (error) {
        adminRelatorio = relatorioAdminLocal(dias);
        renderizarRelatorio();
        mostrarErro("Não foi possível gerar o relatório", error);
    }
}

function linhasCsv(pedidos) {
    return [["numero", "restaurante", "cliente", "status", "pagamento", "modalidade", "total", "criado_em", "atualizado_em"], ...pedidos.map((p) => [p.numero, nomeEmpresa(p.empresa_id), p.cliente_nome || "", p.status, p.pagamento_status, p.pagamento_modalidade || "na_entrega", p.total, p.created_at, p.updated_at])];
}

function baixarCsv(linhas, nome) {
    const csv = linhas.map((linha) => linha.map((valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = nome; link.click(); URL.revokeObjectURL(url);
}

function exportarRelatorioCsv() {
    baixarCsv(linhasCsv(adminPedidos), `multi-delivery-relatorio-${new Date().toISOString().slice(0, 10)}.csv`);
}

function renderizarGraficoAdmin() {
    const container = document.getElementById("adminChart");
    const agora = new Date();
    const grupos = [];
    for (let indice = 6; indice >= 0; indice -= 1) {
        const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - indice);
        grupos.push({ chave: data.toISOString().slice(0, 10), label: data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), valor: 0, pedidos: 0 });
    }
    adminPedidos.forEach((pedido) => {
        const data = new Date(pedido.created_at);
        const chave = new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().slice(0, 10);
        const grupo = grupos.find((item) => item.chave === chave);
        if (!grupo) return;
        grupo.pedidos += 1;
        if (pedido.status === "entregue" && pedido.pagamento_status === "pago") grupo.valor += Number(pedido.total || 0);
    });
    const total = grupos.reduce((soma, grupo) => soma + grupo.valor, 0);
    const maximo = Math.max(...grupos.map((grupo) => grupo.valor), 1);
    document.getElementById("adminSemanaTotal").textContent = App.dinheiro(total);
    container.replaceChildren();
    grupos.forEach((grupo) => {
        const coluna = elemento("div", "admin-chart-column");
        coluna.title = `${grupo.label}: ${grupo.pedidos} pedidos, ${App.dinheiro(grupo.valor)}`;
        coluna.append(elemento("strong", "", grupo.valor ? App.dinheiro(grupo.valor) : ""));
        const barra = elemento("div", "admin-chart-bar"); barra.style.height = `${Math.max(4, grupo.valor / maximo * 215)}px`;
        coluna.append(barra, elemento("span", "", grupo.label)); container.append(coluna);
    });
}

function renderizarPedidosRecentes() {
    const container = document.getElementById("adminPedidosRecentes");
    container.replaceChildren();
    const recentes = adminPedidos.slice(0, 6);
    if (!recentes.length) { container.append(elemento("p", "", "Nenhum pedido registrado.")); return; }
    recentes.forEach((pedido) => {
        const item = elemento("button", "recent-order"); item.type = "button";
        const info = elemento("div");
        info.append(elemento("strong", "", `#${pedido.numero || String(pedido.id).slice(0, 8)} • ${nomeEmpresa(pedido.empresa_id)}`), elemento("small", "", `${statusLegivel(pedido.status)} • ${dataCurta(pedido.created_at)}`));
        item.append(elemento("span", "", "▣"), info, elemento("em", "", App.dinheiro(pedido.total)));
        item.addEventListener("click", () => abrirDetalhesPedido(pedido));
        container.append(item);
    });
}

function preencherFiltroEmpresas() {
    const select = document.getElementById("filtroPedidoEmpresa");
    const valor = select.value;
    select.replaceChildren();
    const todos = document.createElement("option"); todos.value = ""; todos.textContent = "Todos"; select.append(todos);
    adminEmpresas.forEach((empresa) => { const option = document.createElement("option"); option.value = empresa.id; option.textContent = empresa.nome; select.append(option); });
    select.value = valor;
}

function pedidosFiltrados() {
    const termo = document.getElementById("buscaAdminPedido").value.trim().toLowerCase();
    const empresa = document.getElementById("filtroPedidoEmpresa").value;
    const status = document.getElementById("filtroPedidoStatus").value;
    const pagamento = document.getElementById("filtroPedidoPagamento").value;
    const inicio = document.getElementById("filtroPedidoInicio").value;
    const fim = document.getElementById("filtroPedidoFim").value;
    const inicioMs = inicio ? new Date(`${inicio}T00:00:00`).getTime() : null;
    const fimMs = fim ? new Date(`${fim}T23:59:59.999`).getTime() : null;
    return adminPedidos.filter((pedido) => {
        const busca = `${pedido.numero || ""} ${pedido.cliente_nome || ""} ${pedido.cliente_telefone || ""} ${pedido.empresa_nome || ""} ${nomeEmpresa(pedido.empresa_id)}`.toLowerCase();
        const criado = new Date(pedido.created_at).getTime();
        return (!termo || busca.includes(termo))
            && (!empresa || String(pedido.empresa_id) === empresa)
            && (!status || pedido.status === status)
            && (!pagamento || pedido.pagamento_status === pagamento)
            && (!inicioMs || criado >= inicioMs)
            && (!fimMs || criado <= fimMs);
    });
}

function classeStatusPedido(status) {
    if (status === "entregue") return "active";
    if (status === "cancelado") return "blocked";
    return "";
}

function renderizarPedidos() {
    const tbody = document.getElementById("adminPedidos");
    const cards = document.getElementById("adminPedidoCards");
    const lista = pedidosFiltrados();
    const paginas = Math.max(1, Math.ceil(lista.length / pedidosPorPagina));
    paginaPedidos = Math.min(Math.max(1, paginaPedidos), paginas);
    const inicio = (paginaPedidos - 1) * pedidosPorPagina;
    const pagina = lista.slice(inicio, inicio + pedidosPorPagina);
    tbody.replaceChildren();
    cards?.replaceChildren();
    if (!pagina.length) {
        tbody.append(vazioTabela(7, "Nenhum pedido corresponde aos filtros."));
        cards?.append(elemento("div", "admin-order-empty", "Nenhum pedido corresponde aos filtros."));
    }
    pagina.forEach((pedido) => {
        const tr = document.createElement("tr");
        const numero = document.createElement("td");
        numero.append(elemento("strong", "", `#${pedido.numero || String(pedido.id).slice(0, 8)}`), elemento("small", "", pedido.cliente_nome || "Cliente"));
        const pagamento = document.createElement("td");
        pagamento.append(elemento("span", `status-pill ${pedido.pagamento_status === "pago" ? "active" : pedido.pagamento_status === "estornado" ? "blocked" : ""}`, pedido.pagamento_status || "pendente"), elemento("small", "", pedido.pagamento_modalidade === "online" ? "Online" : "Na entrega"));
        const acao = document.createElement("td");
        const detalhes = botao("Ver detalhes", "admin-action secondary");
        detalhes.addEventListener("click", () => abrirDetalhesPedido(pedido));
        acao.append(detalhes);
        tr.append(numero, elemento("td", "", nomeEmpresa(pedido.empresa_id)), elemento("td", "", dataHora(pedido.created_at)), elemento("td", "", ""), pagamento, elemento("td", "", App.dinheiro(pedido.total)), acao);
        tr.children[3].append(elemento("span", `status-pill ${classeStatusPedido(pedido.status)}`, statusLegivel(pedido.status)));
        tbody.append(tr);
        if (cards) {
            const card = elemento("article", "admin-order-card");
            const top = elemento("div", "admin-order-card-top");
            const title = elemento("div", "admin-order-card-title");
            title.append(elemento("strong", "", `#${pedido.numero || String(pedido.id).slice(0, 8)}`), elemento("span", "", pedido.cliente_nome || "Cliente"));
            top.append(title, elemento("span", `status-pill ${classeStatusPedido(pedido.status)}`, statusLegivel(pedido.status)));
            const meta = elemento("div", "admin-order-card-meta");
            const linhaMeta = (rotulo, valor) => {
                const linha = elemento("div");
                linha.append(elemento("span", "", rotulo), elemento("strong", "", valor));
                return linha;
            };
            meta.append(
                linhaMeta("Restaurante", nomeEmpresa(pedido.empresa_id)),
                linhaMeta("Data", dataHora(pedido.created_at)),
                linhaMeta("Pagamento", `${pedido.pagamento_status || "pendente"} • ${pedido.pagamento_modalidade === "online" ? "Online" : "Na entrega"}`)
            );
            const footer = elemento("div", "admin-order-card-footer");
            footer.append(elemento("strong", "", App.dinheiro(pedido.total)));
            const abrir = botao("Ver detalhes", "admin-primary-button");
            abrir.addEventListener("click", () => abrirDetalhesPedido(pedido));
            footer.append(abrir);
            card.append(top, meta, footer);
            cards.append(card);
        }
    });
    const primeiro = lista.length ? inicio + 1 : 0;
    const ultimo = Math.min(inicio + pedidosPorPagina, lista.length);
    document.getElementById("resumoPedidos").textContent = `${primeiro}–${ultimo} de ${lista.length} pedidos`;
    document.getElementById("paginaPedidos").textContent = `${paginaPedidos}/${paginas}`;
    document.getElementById("pedidosAnterior").disabled = paginaPedidos <= 1;
    document.getElementById("pedidosProxima").disabled = paginaPedidos >= paginas;
}
function blocoDetalhe(rotulo, valor) {
    const artigo = document.createElement("article");
    artigo.append(elemento("small", "", rotulo), elemento("strong", "", valor || "—"));
    return artigo;
}

async function abrirDetalhesPedido(pedidoResumo) {
    const carregando = elemento("div", "admin-loading-inline", "Carregando detalhes do pedido...");
    abrirModal({ titulo: `Pedido #${pedidoResumo.numero || ""}`, kicker: "DETALHES DO PEDIDO", corpo: carregando, acoes: [botao("Fechar")] });
    modalAcoes.firstElementChild.addEventListener("click", () => fecharModal());
    let pedido = null, error = null; try { pedido = await window.DeliveryAPI.adminDetalhePedido(pedidoResumo.id); } catch (erro) { error = erro; }
    if (error || !pedido) {
        modalCorpo.replaceChildren(elemento("div", "admin-error", recursoNaoMigrado(error, "admin_obter_pedido") ? "Execute a migração 010_admin_avancado.sql para abrir os detalhes completos." : App.mensagemErro(error || { message: "Pedido não encontrado." })));
        return;
    }
    modalTitulo.textContent = `Pedido #${pedido.numero || ""}`;
    const corpo = document.createDocumentFragment();
    const resumo = elemento("div", "order-summary-grid");
    resumo.append(
        blocoDetalhe("Restaurante", pedido.empresa_nome || nomeEmpresa(pedido.empresa_id)),
        blocoDetalhe("Status", statusLegivel(pedido.status)),
        blocoDetalhe("Total", App.dinheiro(pedido.total)),
        blocoDetalhe("Cliente", pedido.cliente_nome || "Cliente"),
        blocoDetalhe("Telefone", pedido.cliente_telefone || "Não informado"),
        blocoDetalhe("Pagamento", `${pedido.pagamento || "—"} • ${pedido.pagamento_status || "pendente"}`),
        blocoDetalhe("Criado em", dataHora(pedido.created_at)),
        blocoDetalhe("Agendado", pedido.agendado_para ? dataHora(pedido.agendado_para) : "Entrega imediata"),
        blocoDetalhe("Cupom", pedido.cupom || "Sem cupom")
    );
    corpo.append(resumo);
    const endereco = elemento("section", "order-detail-section"); endereco.append(elemento("h3", "", "Endereço e observações"), elemento("p", "", pedido.endereco || "Endereço não informado"));
    if (pedido.observacoes) endereco.append(elemento("small", "", pedido.observacoes));
    corpo.append(endereco);
    const itens = elemento("section", "order-detail-section"); itens.append(elemento("h3", "", "Itens do pedido"));
    (pedido.itens || []).forEach((item) => {
        const linha = elemento("div", "order-product");
        const info = elemento("div");
        const adicionais = Array.isArray(item.adicionais) ? item.adicionais.map((adicional) => adicional.nome || adicional).join(", ") : "";
        info.append(elemento("strong", "", `${item.nome_produto || "Produto"}${item.variante_nome ? ` • ${item.variante_nome}` : ""}`));
        if (adicionais || item.observacao) info.append(elemento("small", "", [adicionais, item.observacao].filter(Boolean).join(" • ")));
        linha.append(elemento("strong", "", `${item.quantidade}×`), info, elemento("strong", "", App.dinheiro(Number(item.preco_unitario || 0) * Number(item.quantidade || 0))));
        itens.append(linha);
    });
    if (!(pedido.itens || []).length) itens.append(elemento("p", "", "Itens não encontrados."));
    corpo.append(itens);
    const valores = elemento("div", "order-summary-grid order-detail-section");
    valores.append(blocoDetalhe("Subtotal", App.dinheiro(pedido.subtotal)), blocoDetalhe("Entrega", App.dinheiro(pedido.taxa_entrega)), blocoDetalhe("Desconto", App.dinheiro(pedido.desconto)));
    corpo.append(valores);
    const historico = elemento("section", "order-detail-section"); historico.append(elemento("h3", "", "Linha do tempo"));
    const timeline = elemento("div", "order-timeline");
    (pedido.historico || []).forEach((evento) => { const item = elemento("div"); item.append(elemento("strong", "", statusLegivel(evento.status)), elemento("small", "", dataHora(evento.created_at || evento.criado_em))); timeline.append(item); });
    if (!(pedido.historico || []).length) timeline.append(elemento("p", "", "Sem eventos registrados."));
    historico.append(timeline); corpo.append(historico);
    modalCorpo.replaceChildren(corpo);
}

async function definirRestaurante(empresa, publicado, status, acaoBotao) {
    acaoBotao.disabled = true;
    let error = null; try { await window.DeliveryAPI.adminAcao({ acao: "restaurante_status", empresa_id: empresa.id, publicado, status }); } catch (erro) { error = erro; }
    acaoBotao.disabled = false;
    if (error) return mostrarErro("Não foi possível atualizar o restaurante", error);
    empresa.publicado = publicado; empresa.status = status;
    renderizarEmpresas(); atualizarMetricasAdmin();
    window.AppToast?.("Restaurante atualizado", `${empresa.nome} foi ${publicado ? "publicado" : "retirado do catálogo"}.`, "success");
}

function abrirFormularioRestaurante(empresa) {
    const form = elemento("form", "admin-form-grid"); form.id = "formRestauranteAdmin";
    const nome = campoFormulario("Nome", "adminEmpresaNome", "text", empresa.nome, { required: true });
    const email = campoFormulario("E-mail", "adminEmpresaEmail", "email", empresa.email);
    const telefone = campoFormulario("Telefone", "adminEmpresaTelefone", "tel", empresa.telefone);
    const categoria = campoFormulario("Categoria", "adminEmpresaCategoria", "text", empresa.categoria);
    const descricao = campoFormulario("Descrição", "adminEmpresaDescricao", "textarea", empresa.descricao, { full: true });
    const taxa = campoFormulario("Taxa de entrega", "adminEmpresaTaxa", "number", empresa.taxa_entrega || 0, { min: 0, step: 0.01 });
    const minimo = campoFormulario("Pedido mínimo", "adminEmpresaMinimo", "number", empresa.pedido_minimo || 0, { min: 0, step: 0.01 });
    const tempoMin = campoFormulario("Tempo mínimo (min)", "adminEmpresaTempoMin", "number", empresa.tempo_estimado_min || 25, { min: 5, max: 240 });
    const tempoMax = campoFormulario("Tempo máximo (min)", "adminEmpresaTempoMax", "number", empresa.tempo_estimado_max || 45, { min: 5, max: 360 });
    const publicado = campoCheck("Publicado no catálogo", "adminEmpresaPublicado", empresa.publicado);
    const status = campoCheck("Restaurante aberto", "adminEmpresaStatus", empresa.status);
    form.append(nome.caixa, email.caixa, telefone.caixa, categoria.caixa, descricao.caixa, taxa.caixa, minimo.caixa, tempoMin.caixa, tempoMax.caixa, publicado.caixa, status.caixa);
    const cancelar = botao("Cancelar"); cancelar.addEventListener("click", () => fecharModal());
    const salvar = botao("Salvar alterações", "admin-primary-button");
    salvar.addEventListener("click", async () => {
        if (!form.reportValidity()) return;
        salvar.disabled = true;
        let error = null; try { await window.DeliveryAPI.adminAcao({
            acao: "restaurante_atualizar",
            p_empresa_id: empresa.id, p_nome: nome.entrada.value, p_email: email.entrada.value,
            p_telefone: telefone.entrada.value, p_categoria: categoria.entrada.value,
            p_descricao: descricao.entrada.value, p_taxa_entrega: Number(taxa.entrada.value || 0),
            p_pedido_minimo: Number(minimo.entrada.value || 0), p_tempo_min: Number(tempoMin.entrada.value || 25),
            p_tempo_max: Number(tempoMax.entrada.value || 45), p_publicado: publicado.entrada.checked,
            p_status: status.entrada.checked
        }); } catch (erro) { error = erro; }
        salvar.disabled = false;
        if (error) return mostrarErro(recursoNaoMigrado(error, "admin_atualizar_restaurante") ? "Execute a migração 010_admin_avancado.sql" : "Não foi possível salvar", error);
        fecharModal();
        await carregarDadosAdmin();
        window.AppToast?.("Restaurante salvo", "As informações foram atualizadas.", "success");
    });
    abrirModal({ titulo: `Editar ${empresa.nome}`, kicker: "RESTAURANTE", corpo: form, acoes: [cancelar, salvar] });
}

function renderizarEmpresas() {
    const tbody = document.getElementById("adminEmpresas");
    const termo = document.getElementById("buscaAdminEmpresa").value.trim().toLowerCase();
    const lista = adminEmpresas.filter((empresa) => !termo || `${empresa.nome} ${empresa.email} ${empresa.cnpj}`.toLowerCase().includes(termo));
    tbody.replaceChildren();
    if (!lista.length) { tbody.append(vazioTabela(6, "Nenhum restaurante encontrado.")); return; }
    lista.forEach((empresa) => {
        const tr = document.createElement("tr");
        const nome = document.createElement("td"); nome.append(elemento("strong", "", empresa.nome || "Restaurante"), elemento("small", "", empresa.cnpj || "CNPJ não informado"));
        const contato = document.createElement("td"); contato.append(elemento("strong", "", empresa.email || "E-mail não informado"), elemento("small", "", empresa.telefone || "Telefone não informado"));
        const publicacao = document.createElement("td"); publicacao.append(elemento("span", `status-pill ${empresa.publicado ? "active" : ""}`, empresa.publicado ? "Publicado" : "Pendente"));
        const operacao = document.createElement("td"); operacao.append(elemento("span", `status-pill ${empresa.status ? "active" : "blocked"}`, empresa.status ? "Aberta" : "Fechada"));
        const acoes = elemento("td", ""); const grupo = elemento("div", "admin-action-group");
        const editar = botao("Editar", "admin-action secondary"); editar.addEventListener("click", () => abrirFormularioRestaurante(empresa));
        const moderar = botao(empresa.publicado ? "Suspender" : "Aprovar", `admin-action ${empresa.publicado ? "danger" : "primary"}`);
        moderar.addEventListener("click", async () => {
            const publicar = !empresa.publicado;
            if (!await confirmarAcao(`${publicar ? "Aprovar" : "Suspender"} restaurante`, `${empresa.nome} ${publicar ? "será exibido no catálogo" : "deixará de aparecer para os clientes"}.`, publicar ? "Aprovar" : "Suspender", !publicar)) return;
            definirRestaurante(empresa, publicar, publicar ? true : false, moderar);
        });
        const excluir = botao("Apagar", "admin-action danger-strong");
        excluir.addEventListener("click", async () => {
            const nomeConfirmacao = await confirmarExclusaoRestaurante(empresa);
            if (!nomeConfirmacao) return;
            excluir.disabled = true;
            const textoOriginal = excluir.textContent;
            excluir.textContent = "Apagando...";
            try {
                await apagarMidiasRestaurante(empresa);
            } catch (error) {
                excluir.disabled = false;
                excluir.textContent = textoOriginal;
                return mostrarErro("Não foi possível apagar as imagens da loja", error);
            }
            let data = null, error = null; try { data = await window.DeliveryAPI.adminAcao({
                acao: "restaurante_excluir", p_empresa_id: empresa.id, p_nome_confirmacao: nomeConfirmacao
            }); } catch (erro) { error = erro; }
            excluir.disabled = false;
            excluir.textContent = textoOriginal;
            if (error || data !== true) {
                const titulo = recursoNaoMigrado(error, "admin_excluir_restaurante")
                    ? "Execute a migration de exclusão de restaurantes"
                    : "Não foi possível apagar a loja";
                return mostrarErro(titulo, error || new Error("Restaurante não encontrado."));
            }
            adminEmpresas = adminEmpresas.filter((item) => String(item.id) !== String(empresa.id));
            renderizarEmpresas();
            atualizarMetricasAdmin();
            anunciar(`${empresa.nome} foi apagado da plataforma.`);
            window.AppToast?.("Loja apagada", "Todos os dados e arquivos da loja foram removidos permanentemente.", "success");
        });
        grupo.append(editar, moderar, excluir); acoes.append(grupo);
        tr.append(nome, contato, elemento("td", "", dataCurta(empresa.created_at)), publicacao, operacao, acoes); tbody.append(tr);
    });
}

async function definirBloqueio(usuario, bloqueado, acaoBotao) {
    acaoBotao.disabled = true;
    let error = null; try { await window.DeliveryAPI.adminAcao({ acao: "usuario_bloqueio", usuario_id: usuario.id, bloqueado }); } catch (erro) { error = erro; }
    acaoBotao.disabled = false;
    if (error) return mostrarErro("Não foi possível atualizar o usuário", error);
    usuario.bloqueado = bloqueado; renderizarUsuarios(); atualizarMetricasAdmin(); anunciar("Usuário atualizado.");
}

function renderizarUsuarios() {
    const tbody = document.getElementById("adminUsuarios");
    const termo = document.getElementById("buscaAdminUsuario").value.trim().toLowerCase();
    const lista = adminUsuarios.filter((usuario) => !termo || `${usuario.nome} ${usuario.sobrenome} ${usuario.telefone}`.toLowerCase().includes(termo));
    tbody.replaceChildren();
    if (!lista.length) { tbody.append(vazioTabela(5, "Nenhum usuário encontrado.")); return; }
    lista.forEach((usuario) => {
        const tr = document.createElement("tr"); const nome = document.createElement("td"); const identidade = elemento("div", "admin-user-identity");
        if (usuario.avatar_url) { const foto = document.createElement("img"); foto.src = usuario.avatar_url; foto.alt = ""; identidade.append(foto); }
        const dadosNome = document.createElement("div"); dadosNome.append(elemento("strong", "", [usuario.nome, usuario.sobrenome].filter(Boolean).join(" ") || "Usuário"), elemento("small", "", String(usuario.id).slice(0, 8))); identidade.append(dadosNome); nome.append(identidade);
        const status = document.createElement("td"); status.append(elemento("span", `status-pill ${usuario.bloqueado ? "blocked" : "active"}`, usuario.bloqueado ? "Bloqueado" : "Ativo"));
        const acao = document.createElement("td"); const acaoBotao = botao(usuario.bloqueado ? "Desbloquear" : "Bloquear pedidos", `admin-action ${usuario.bloqueado ? "primary" : "danger"}`);
        acaoBotao.addEventListener("click", async () => {
            const bloquear = !usuario.bloqueado;
            if (!await confirmarAcao(`${bloquear ? "Bloquear" : "Desbloquear"} usuário`, bloquear ? "O usuário não poderá criar novos pedidos, mas o histórico será preservado." : "O usuário poderá voltar a realizar pedidos.", bloquear ? "Bloquear" : "Desbloquear", bloquear)) return;
            definirBloqueio(usuario, bloquear, acaoBotao);
        });
        acao.append(acaoBotao); tr.append(nome, elemento("td", "", usuario.telefone || "—"), elemento("td", "", dataCurta(usuario.created_at)), status, acao); tbody.append(tr);
    });
}

async function definirCupom(cupom, ativo, acaoBotao) {
    acaoBotao.disabled = true;
    let error = null; try { await window.DeliveryAPI.adminAcao({ acao: "cupom_status", cupom_id: cupom.id, ativo }); } catch (erro) { error = erro; }
    acaoBotao.disabled = false;
    if (error) return mostrarErro("Não foi possível atualizar o cupom", error);
    cupom.ativo = ativo; renderizarCupons(); anunciar("Cupom atualizado.");
}

function beneficioCupom(cupom) {
    if (cupom.tipo === "percentual") return `${Number(cupom.valor || 0)}%`;
    if (cupom.tipo === "frete") return "Frete grátis";
    return App.dinheiro(cupom.valor || cupom.desconto || 0);
}

function abrirFormularioCupom(cupom = null) {
    const atual = cupom || { tipo: "percentual", valor: 10, ativo: true, primeiro_pedido: false, limite_por_usuario: 1, inicio: new Date().toISOString() };
    const form = elemento("form", "admin-form-grid"); form.id = "formCupomAdmin";
    const codigo = campoFormulario("Código", "adminCupomCodigo", "text", atual.codigo || "", { required: true, placeholder: "EXEMPLO20" });
    const tipo = campoFormulario("Tipo", "adminCupomTipo", "select", atual.tipo, { items: [{ value: "percentual", label: "Percentual" }, { value: "fixo", label: "Valor fixo" }, { value: "frete", label: "Frete grátis" }] });
    const valor = campoFormulario("Valor do benefício", "adminCupomValor", "number", atual.valor || 0, { min: 0, step: 0.01, required: true });
    const escopo = campoFormulario("Escopo", "adminCupomEmpresa", "select", atual.empresa_id || "", { items: [{ value: "", label: "Global — todos os restaurantes" }, ...adminEmpresas.map((empresa) => ({ value: empresa.id, label: empresa.nome }))] });
    const pedidoMinimo = campoFormulario("Pedido mínimo", "adminCupomPedidoMinimo", "number", atual.pedido_minimo || 0, { min: 0, step: 0.01 });
    const maxDesconto = campoFormulario("Teto do desconto", "adminCupomMaxDesconto", "number", atual.max_desconto || "", { min: 0, step: 0.01 });
    const limiteUsos = campoFormulario("Limite total de usos", "adminCupomLimite", "number", atual.limite_usos || "", { min: 1 });
    const limiteUsuario = campoFormulario("Limite por usuário", "adminCupomLimiteUsuario", "number", atual.limite_por_usuario || 1, { min: 1, max: 100 });
    const inicio = campoFormulario("Início", "adminCupomInicio", "datetime-local", paraDataLocal(atual.inicio));
    const fim = campoFormulario("Término", "adminCupomFim", "datetime-local", paraDataLocal(atual.fim));
    const primeiroPedido = campoCheck("Somente primeiro pedido", "adminCupomPrimeiro", atual.primeiro_pedido);
    const ativo = campoCheck("Cupom ativo", "adminCupomAtivo", atual.ativo !== false);
    const ajuda = elemento("p", "admin-form-help", "Códigos aceitam letras, números, hífen e sublinhado. O teto é usado principalmente em descontos percentuais."); ajuda.classList.add("full");
    form.append(codigo.caixa, tipo.caixa, valor.caixa, escopo.caixa, pedidoMinimo.caixa, maxDesconto.caixa, limiteUsos.caixa, limiteUsuario.caixa, inicio.caixa, fim.caixa, primeiroPedido.caixa, ativo.caixa, ajuda);
    function ajustarTipo() { const frete = tipo.entrada.value === "frete"; valor.entrada.disabled = frete; if (frete) valor.entrada.value = "0"; }
    tipo.entrada.addEventListener("change", ajustarTipo); ajustarTipo();
    const cancelar = botao("Cancelar"); cancelar.addEventListener("click", () => fecharModal());
    const salvar = botao(cupom ? "Salvar alterações" : "Criar cupom", "admin-primary-button");
    salvar.addEventListener("click", async () => {
        if (!form.reportValidity()) return;
        salvar.disabled = true;
        const inicioIso = inicio.entrada.value ? new Date(inicio.entrada.value).toISOString() : new Date().toISOString();
        const fimIso = fim.entrada.value ? new Date(fim.entrada.value).toISOString() : null;
        let error = null; try { await window.DeliveryAPI.adminAcao({
            acao: "cupom_salvar",
            codigo: codigo.entrada.value, tipo: tipo.entrada.value, valor: Number(valor.entrada.value || 0),
            empresa_id: escopo.entrada.value || null, pedido_minimo: Number(pedidoMinimo.entrada.value || 0),
            limite_usos: limiteUsos.entrada.value ? Number(limiteUsos.entrada.value) : null,
            primeiro_pedido: primeiroPedido.entrada.checked, inicio: inicioIso, fim: fimIso,
            max_desconto: maxDesconto.entrada.value ? Number(maxDesconto.entrada.value) : null,
            limite_por_usuario: Number(limiteUsuario.entrada.value || 1), cupom_id: cupom?.id || null,
            ativo: ativo.entrada.checked
        }); } catch (erro) { error = erro; }
        salvar.disabled = false;
        if (error) return mostrarErro(recursoNaoMigrado(error, "admin_salvar_cupom") ? "Execute a migração 010_admin_avancado.sql" : "Não foi possível salvar o cupom", error);
        fecharModal(); await carregarDadosAdmin();
        window.AppToast?.("Cupom salvo", `${codigo.entrada.value.toUpperCase()} está pronto para uso.`, "success");
    });
    abrirModal({ titulo: cupom ? `Editar ${cupom.codigo}` : "Criar novo cupom", kicker: "PROMOÇÕES", corpo: form, acoes: [cancelar, salvar] });
}

async function excluirCupom(cupom) {
    if (!await confirmarAcao("Excluir cupom", `O cupom ${cupom.codigo} será removido permanentemente. Pedidos anteriores continuarão preservados.`, "Excluir permanentemente", true)) return;
    let error = null; try { await window.DeliveryAPI.adminAcao({ acao: "cupom_excluir", cupom_id: cupom.id }); } catch (erro) { error = erro; }
    if (error) return mostrarErro(recursoNaoMigrado(error, "admin_excluir_cupom") ? "Execute a migração 010_admin_avancado.sql" : "Não foi possível excluir o cupom", error);
    adminCupons = adminCupons.filter((item) => item.id !== cupom.id); renderizarCupons();
    window.AppToast?.("Cupom excluído", `${cupom.codigo} foi removido.`, "success");
}

function renderizarCupons() {
    const tbody = document.getElementById("adminCupons");
    const termo = document.getElementById("buscaAdminCupom").value.trim().toLowerCase();
    const lista = adminCupons.filter((cupom) => !termo || `${cupom.codigo || ""} ${nomeEmpresa(cupom.empresa_id)}`.toLowerCase().includes(termo));
    tbody.replaceChildren();
    if (!lista.length) { tbody.append(vazioTabela(7, "Nenhum cupom encontrado.")); return; }
    lista.forEach((cupom) => {
        const tr = document.createElement("tr");
        const status = document.createElement("td"); status.append(elemento("span", `status-pill ${cupom.ativo ? "active" : "blocked"}`, cupom.ativo ? "Ativo" : "Pausado"));
        const uso = cupom.limite_usos ? `${cupom.usos || 0}/${cupom.limite_usos}` : `${cupom.usos || 0} usos`;
        const acoes = document.createElement("td"); const grupo = elemento("div", "admin-action-group");
        const editar = botao("Editar", "admin-action secondary"); editar.addEventListener("click", () => abrirFormularioCupom(cupom));
        const pausar = botao(cupom.ativo ? "Pausar" : "Ativar", `admin-action ${cupom.ativo ? "warning" : "primary"}`); pausar.addEventListener("click", () => definirCupom(cupom, !cupom.ativo, pausar));
        const excluir = botao("Excluir", "admin-action danger"); excluir.addEventListener("click", () => excluirCupom(cupom));
        grupo.append(editar, pausar, excluir); acoes.append(grupo);
        tr.append(elemento("td", "", cupom.codigo || "—"), elemento("td", "", cupom.empresa_id ? nomeEmpresa(cupom.empresa_id) : "Global"), elemento("td", "", beneficioCupom(cupom)), elemento("td", "", uso), elemento("td", "", cupom.fim ? dataCurta(cupom.fim) : "Sem validade"), status, acoes);
        tbody.append(tr);
    });
}

function statusAssinaturaLegivel(status) {
    return ({ trial: 'Trial', ativa: 'Ativa', inadimplente: 'Inadimplente', cancelada: 'Cancelada', expirada: 'Expirada' })[status] || String(status || '—');
}

function limitePlano(valor) {
    return valor === null || valor === undefined || valor === '' ? 'Ilimitado' : Number(valor).toLocaleString('pt-BR');
}

function recursoPlanoLabels(recursos) {
    const nomes = { multiunidade: 'Multiunidade', equipe: 'Equipe', operacao: 'Operação', financeiro: 'Financeiro' };
    return Object.entries(recursos && typeof recursos === 'object' ? recursos : {}).filter(([, ativo]) => ativo === true).map(([chave]) => nomes[chave] || chave.replaceAll('_', ' '));
}

function renderizarPlanosAssinaturas() {
    const grid = document.getElementById('adminPlanosGrid');
    const tbody = document.getElementById('adminAssinaturas');
    if (!grid || !tbody) return;
    document.getElementById('adminPlanosAtivos').textContent = String(adminPlanosPlataforma.filter((plano) => plano.ativo !== false).length);
    document.getElementById('adminAssinaturasTotal').textContent = String(adminAssinaturas.length);
    document.getElementById('adminTrialsTotal').textContent = String(adminAssinaturas.filter((item) => item.status === 'trial').length);
    document.getElementById('adminAssinaturasProblema').textContent = String(adminAssinaturas.filter((item) => ['inadimplente','cancelada','expirada'].includes(item.status)).length);
    grid.replaceChildren();
    if (!adminPlanosPlataforma.length) { grid.append(elemento('p', 'admin-loading-inline', 'Nenhum plano cadastrado.')); }
    else {
        adminPlanosPlataforma.forEach((plano) => {
            const card = elemento('article', 'admin-plan-card' + (plano.ativo === false ? ' is-disabled' : ''));
            const topo = elemento('div', 'admin-plan-card-top');
            const titulo = elemento('div');
            titulo.append(elemento('span', 'admin-plan-badge', plano.padrao_novos ? 'Padrão para novos' : (plano.interno ? 'Interno' : 'Comercial')));
            titulo.append(elemento('h3', '', plano.nome || 'Plano'));
            titulo.append(elemento('p', '', plano.descricao || 'Sem descrição cadastrada.'));
            const preco = elemento('strong', 'admin-plan-price', plano.preco_mensal == null ? 'Sob consulta' : App.dinheiro(plano.preco_mensal) + '/mês');
            topo.append(titulo, preco);
            const limites = elemento('div', 'admin-plan-limits');
            [['Unidades',plano.limite_unidades],['Produtos',plano.limite_produtos],['Funcionários',plano.limite_funcionarios],['Pedidos/mês',plano.limite_pedidos_mes]].forEach(([rotulo, valor]) => { const item=elemento('div'); item.append(elemento('small','',rotulo),elemento('strong','',limitePlano(valor))); limites.append(item); });
            const rodape = elemento('div','admin-plan-card-footer');
            const recursos = recursoPlanoLabels(plano.recursos);
            rodape.append(elemento('span','admin-plan-trial', plano.trial_dias > 0 ? plano.trial_dias + ' dias de trial' : 'Sem trial'));
            const acoes = elemento('div','admin-action-group');
            const editar = botao('Editar','admin-action secondary'); editar.addEventListener('click', () => abrirFormularioPlano(plano));
            acoes.append(editar); rodape.append(acoes);
            card.append(topo,limites);
            if (recursos.length) card.append(elemento('p','admin-plan-features',recursos.join(' • ')));
            card.append(rodape); grid.append(card);
        });
    }
    const termo = document.getElementById('buscaAdminAssinatura')?.value.trim().toLowerCase() || '';
    const lista = adminAssinaturas.filter((item) => !termo || (String(item.empresa_nome || '') + ' ' + String(item.plano_nome || '') + ' ' + String(item.plano_slug || '') + ' ' + String(item.status || '')).toLowerCase().includes(termo));
    tbody.replaceChildren();
    if (!lista.length) { tbody.append(vazioTabela(7, termo ? 'Nenhuma assinatura corresponde à busca.' : 'Nenhuma assinatura encontrada.')); return; }
    lista.forEach((item) => {
        const tr = document.createElement('tr');
        const status = elemento('span','status-pill ' + (['ativa','trial'].includes(item.status) ? 'active' : 'blocked'),statusAssinaturaLegivel(item.status));
        const acao = botao('Alterar','admin-action secondary'); acao.addEventListener('click', () => abrirFormularioAssinatura(item));
        const tdAcao = document.createElement('td'); tdAcao.append(acao);
        const tdStatus = document.createElement('td'); tdStatus.append(status);
        tr.append(elemento('td','',item.empresa_nome || '—'),elemento('td','',item.plano_nome || '—'),tdStatus,elemento('td','',dataCurta(item.inicio_em)),elemento('td','',item.trial_fim_em ? dataHora(item.trial_fim_em) : '—'),elemento('td','',dataHora(item.updated_at)),tdAcao);
        tbody.append(tr);
    });
}

function abrirFormularioPlano(plano = null) {
    const atual = plano || { slug:'', nome:'', descricao:'', ativo:true, interno:false, padrao_novos:false, preco_mensal:'', moeda:'BRL', trial_dias:0, limite_unidades:'', limite_produtos:'', limite_funcionarios:'', limite_pedidos_mes:'', recursos:{}, ordem:0 };
    const form=elemento('form','admin-form-grid'); form.id='formPlanoAdmin';
    const slug=campoFormulario('Slug','adminPlanoSlug','text',atual.slug || '',{required:true,placeholder:'profissional'});
    const nome=campoFormulario('Nome','adminPlanoNome','text',atual.nome || '',{required:true,placeholder:'Plano Profissional'});
    const descricao=campoFormulario('Descrição','adminPlanoDescricao','text',atual.descricao || '',{placeholder:'Resumo do plano'}); descricao.caixa.classList.add('full');
    const preco=campoFormulario('Preço mensal (BRL)','adminPlanoPreco','number',atual.preco_mensal ?? '',{min:0,step:0.01});
    const trial=campoFormulario('Trial em dias','adminPlanoTrial','number',atual.trial_dias ?? 0,{min:0,max:365});
    const moeda=campoFormulario('Moeda','adminPlanoMoeda','text',atual.moeda || 'BRL',{maxlength:3,required:true});
    const ordem=campoFormulario('Ordem','adminPlanoOrdem','number',atual.ordem ?? 0,{step:1});
    const lu=campoFormulario('Limite de unidades','adminPlanoUnidades','number',atual.limite_unidades ?? '',{min:1});
    const lp=campoFormulario('Limite de produtos','adminPlanoProdutos','number',atual.limite_produtos ?? '',{min:1});
    const lf=campoFormulario('Limite de funcionários','adminPlanoFuncionarios','number',atual.limite_funcionarios ?? '',{min:1});
    const lped=campoFormulario('Limite de pedidos/mês','adminPlanoPedidos','number',atual.limite_pedidos_mes ?? '',{min:1});
    const ativo=campoCheck('Plano ativo','adminPlanoAtivo',atual.ativo !== false);
    const interno=campoCheck('Plano interno','adminPlanoInterno',atual.interno === true);
    const padrao=campoCheck('Plano padrão para novos restaurantes','adminPlanoPadrao',atual.padrao_novos === true);
    const recursos=elemento('fieldset','admin-plan-resource-fieldset'); recursos.append(elemento('legend','', 'Recursos habilitados'));
    [['multiunidade','Multiunidade'],['equipe','Equipe'],['operacao','Operação'],['financeiro','Financeiro']].forEach(([valor,rotulo]) => { const label=document.createElement('label'); const input=document.createElement('input'); input.type='checkbox'; input.value=valor; input.checked=atual.recursos?.[valor] === true; label.append(input,document.createTextNode(rotulo)); recursos.append(label); });
    form.append(slug.caixa,nome.caixa,preco.caixa,trial.caixa,moeda.caixa,ordem.caixa,lu.caixa,lp.caixa,lf.caixa,lped.caixa,descricao.caixa,ativo.caixa,interno.caixa,padrao.caixa,recursos);
    const cancelar=botao('Cancelar'); cancelar.addEventListener('click',()=>fecharModal());
    const salvar=botao(plano?'Salvar alterações':'Criar plano','admin-primary-button');
    salvar.addEventListener('click',async()=>{
        if(!form.reportValidity()) return; salvar.disabled=true;
        const recursoMap=Object.fromEntries([...recursos.querySelectorAll('input[type=checkbox]')].map((input)=>[input.value,input.checked]));
        const payload={id:plano?.id||null,slug:slug.entrada.value.trim().toLowerCase(),nome:nome.entrada.value.trim(),descricao:descricao.entrada.value.trim(),ativo:ativo.entrada.checked,interno:interno.entrada.checked,padrao_novos:padrao.entrada.checked,preco_mensal:preco.entrada.value,moeda:moeda.entrada.value.trim().toUpperCase(),trial_dias:Number(trial.entrada.value||0),limite_unidades:lu.entrada.value,limite_produtos:lp.entrada.value,limite_funcionarios:lf.entrada.value,limite_pedidos_mes:lped.entrada.value,recursos:recursoMap,ordem:Number(ordem.entrada.value||0)};
        try{await window.DeliveryAPI.adminSalvarPlano(payload);fecharModal();await carregarDadosAdmin();window.AppToast?.('Plano salvo',payload.nome+' foi atualizado.','success');}
        catch(erro){mostrarErro(recursoNaoMigrado(erro,'admin_plano_salvar')?'Execute a migração de planos 4.3':'Não foi possível salvar o plano',erro);}
        finally{salvar.disabled=false;}
    });
    abrirModal({titulo:plano?'Editar '+plano.nome:'Novo plano da plataforma',kicker:'PLANOS',corpo:form,acoes:[cancelar,salvar]});
}

function abrirFormularioAssinatura(assinatura) {
    const form=elemento('form','admin-form-grid');
    const empresa=campoFormulario('Restaurante','adminAssinaturaEmpresa','select',assinatura.empresa_id,{items:adminEmpresas.map((item)=>({value:item.id,label:item.nome})),required:true});
    const plano=campoFormulario('Plano','adminAssinaturaPlano','select',assinatura.plano_id,{items:adminPlanosPlataforma.filter((item)=>item.ativo!==false).map((item)=>({value:item.id,label:item.nome+(item.preco_mensal==null?'':' — '+App.dinheiro(item.preco_mensal)+'/mês')})),required:true});
    const status=campoFormulario('Status','adminAssinaturaStatus','select',assinatura.status||'ativa',{items:[{value:'trial',label:'Trial'},{value:'ativa',label:'Ativa'},{value:'inadimplente',label:'Inadimplente'},{value:'cancelada',label:'Cancelada'},{value:'expirada',label:'Expirada'}]});
    const trial=campoFormulario('Dias de trial','adminAssinaturaTrial','number',0,{min:0,max:365});
    const ajuda=elemento('p','admin-form-help full','A alteração substitui a assinatura atual da empresa e aplica o plano ativo imediatamente.');
    form.append(empresa.caixa,plano.caixa,status.caixa,trial.caixa,ajuda); empresa.entrada.disabled=true;
    const cancelar=botao('Cancelar'); cancelar.addEventListener('click',()=>fecharModal());
    const salvar=botao('Salvar assinatura','admin-primary-button');
    salvar.addEventListener('click',async()=>{
        if(!form.reportValidity()) return; salvar.disabled=true;
        try{await window.DeliveryAPI.adminSalvarAssinatura({empresa_id:assinatura.empresa_id,plano_id:plano.entrada.value,status:status.entrada.value,trial_dias:Number(trial.entrada.value||0)});fecharModal();await carregarDadosAdmin();window.AppToast?.('Assinatura atualizada',assinatura.empresa_nome+' teve o plano atualizado.','success');}
        catch(erro){mostrarErro(recursoNaoMigrado(erro,'admin_assinatura_definir')?'Execute a migração de planos 4.3':'Não foi possível alterar a assinatura',erro);}
        finally{salvar.disabled=false;}
    });
    abrirModal({titulo:'Assinatura • '+assinatura.empresa_nome,kicker:'ACESSO DO RESTAURANTE',corpo:form,acoes:[cancelar,salvar]});
}

async function carregarDadosAdmin() {
    if (carregandoDados) return;
    carregandoDados = true;
    try {
        const snapshot = await window.DeliveryAPI.adminDashboard();
        const resEmpresas = { data: snapshot?.empresas || [], error: null };
        const resUsuarios = { data: snapshot?.usuarios || [], error: null };
        const resPedidos = { data: (snapshot?.pedidos || []).map((pedido) => ({ pagamento_status: "pendente", pagamento_modalidade: "na_entrega", ...pedido })), error: null };
        const resCupons = { data: snapshot?.cupons || [], error: null };
            const resLogs = { data: snapshot?.logs || [], error: null };
        const resAuditoria = { data: snapshot?.auditoria || [], error: null };\n        let resPlanos = { data: [], error: null };\n        let resAssinaturas = { data: [], error: null };\n        try { resPlanos = { data: await window.DeliveryAPI.adminPlanos(), error: null }; } catch (error) { resPlanos = { data: [], error }; registrarCompatibilidade("planos"); }\n        try { resAssinaturas = { data: await window.DeliveryAPI.adminAssinaturas(), error: null }; } catch (error) { resAssinaturas = { data: [], error }; registrarCompatibilidade("assinaturas"); }
        const erro = [resEmpresas, resUsuarios, resPedidos, resCupons, resLogs, resAuditoria].find((resposta) => resposta.error)?.error;
        if (erro) throw erro;
        adminEmpresas = resEmpresas.data || [];
        adminUsuarios = resUsuarios.data || [];
        adminPedidos = resPedidos.data || [];
        adminCupons = resCupons.data || [];
        adminLogs = resLogs.data || [];
        adminAuditoria = resAuditoria.data || [];
        preencherFiltroEmpresas();
        atualizarMetricasAdmin(); renderizarGraficoAdmin(); renderizarPedidosRecentes(); renderizarPedidos();
        renderizarEmpresas(); renderizarUsuarios(); renderizarCupons(); renderizarPlanosAssinaturas();
        await carregarRelatorio(); exibirAvisoCompatibilidade();
    } finally {
        carregandoDados = false;
    }
}

function agendarRecarregamento() {
    clearTimeout(recarregarTimer);
    recarregarTimer = setTimeout(() => carregarDadosAdmin().catch((erro) => mostrarErro("Não foi possível atualizar o painel", erro)), 500);
}

function aplicarTamanhoFonte(valor) {
    const permitido = ["normal", "large", "xlarge"].includes(valor) ? valor : "normal";
    document.body.dataset.adminFont = permitido;
    document.getElementById("adminFontSize").value = permitido;
    localStorage.setItem("admin_font_size", permitido);
    anunciar(`Tamanho das letras: ${{ normal: "normal", large: "grande", xlarge: "extra grande" }[permitido]}.`);
}

let mostrarSecaoAdmin = () => {};

function configurarNavegacao() {
    const views = [...document.querySelectorAll("[data-admin-view]")];
    const links = [...document.querySelectorAll(".admin-sidebar nav a[href^='#']")];
    const viewIds = new Set(views.map((view) => view.id));

    const titulos = {
        overview: "Central administrativa",
        pedidos: "Gestão de pedidos",
        restaurantes: "Moderação de restaurantes",
        usuarios: "Usuários da plataforma",
                cupons: "Gestão de cupons",
        relatorios: "Relatórios e inteligência",
        suporte: "Suporte e pendências"
    };

    function idSecao(valor = location.hash) {
        const id = String(valor || "").replace(/^#/, "");
        return viewIds.has(id) ? id : "overview";
    }

    mostrarSecaoAdmin = function(id, { atualizarHistorico = false, focar = false } = {}) {
        const secaoId = idSecao(id);
        views.forEach((view) => {
            const ativa = view.id === secaoId;
            view.hidden = !ativa;
            view.classList.toggle("is-active", ativa);
            view.setAttribute("aria-hidden", String(!ativa));
        });
        links.forEach((link) => {
            const ativo = link.getAttribute("href") === `#${secaoId}`;
            link.classList.toggle("active", ativo);
            if (ativo) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
        const headerTitle = document.getElementById("adminHeaderTitle");
        if (headerTitle && titulos[secaoId]) {
            headerTitle.textContent = titulos[secaoId];
        }
        if (atualizarHistorico && location.hash !== `#${secaoId}`) {
            history.pushState({ adminView: secaoId }, "", `#${secaoId}`);
        }
        adminSidebar?.classList.remove("open");
        adminOverlay?.classList.remove("show");
        window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        if (focar) document.getElementById(secaoId)?.focus({ preventScroll: true });
    };

    links.forEach((link) => link.addEventListener("click", (event) => {
        event.preventDefault();
        mostrarSecaoAdmin(link.hash, { atualizarHistorico: true, focar: true });
    }));

    document.querySelectorAll("[data-admin-nav]").forEach((elementoNav) => {
        elementoNav.addEventListener("click", (event) => {
            event.preventDefault();
            const destino = elementoNav.getAttribute("data-admin-nav");
            if (destino) mostrarSecaoAdmin(destino, { atualizarHistorico: true, focar: true });
        });
        elementoNav.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                const destino = elementoNav.getAttribute("data-admin-nav");
                if (destino) mostrarSecaoAdmin(destino, { atualizarHistorico: true, focar: true });
            }
        });
    });

    window.addEventListener("popstate", () => mostrarSecaoAdmin(location.hash));
    window.addEventListener("hashchange", () => mostrarSecaoAdmin(location.hash));
    mostrarSecaoAdmin(location.hash);
}

document.getElementById("novoPlano")?.addEventListener("click", () => abrirFormularioPlano());\ndocument.getElementById("buscaAdminAssinatura")?.addEventListener("input", renderizarPlanosAssinaturas);\n\nasync function iniciarAdmin() {
    aplicarTamanhoFonte(localStorage.getItem("admin_font_size") || "normal");
    const { data: { user } } = await db.auth.getUser();
    if (!user) { localStorage.setItem("redirect", "admin.html"); location.replace("login.html"); return; }
    let permitido = false, error = null; try { permitido = (await window.DeliveryAPI.request("/v1/admin/dashboard")) !== null; } catch (erro) { error = erro; }
    if (error || permitido !== true) { alert("Esta conta não possui acesso administrativo."); location.replace("perfil.html"); return; }
    try {
        await carregarDadosAdmin();
        const loadingAdmin = document.getElementById("adminLoading");
        if (loadingAdmin) {
            loadingAdmin.hidden = true;
            loadingAdmin.style.display = "none";
        }
        document.getElementById("adminApp").hidden = false;
        canalAdmin = db.channel("admin-plataforma")
            .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, agendarRecarregamento)
            .on("postgres_changes", { event: "*", schema: "public", table: "empresas" }, agendarRecarregamento)
            .on("postgres_changes", { event: "*", schema: "public", table: "cupons" }, agendarRecarregamento)
            .subscribe();
    } catch (erroDados) {
        console.error(erroDados);
        const loadingAdmin = document.getElementById("adminLoading");
        if (loadingAdmin) {
            loadingAdmin.hidden = false;
            loadingAdmin.style.display = "grid";
            loadingAdmin.replaceChildren(elemento("strong", "", `Não foi possível carregar o painel: ${App.mensagemErro(erroDados)}`));
        }
    }
}

const adminSidebar = document.getElementById("adminSidebar");
const adminOverlay = document.getElementById("adminOverlay");
const adminMenuButton = document.getElementById("adminMenu");

function definirMenuAdmin(aberto) {
    adminSidebar?.classList.toggle("open", aberto);
    adminOverlay?.classList.toggle("show", aberto);
    adminMenuButton?.setAttribute("aria-expanded", String(aberto));
    document.body.classList.toggle("admin-menu-open", aberto);
}

function fecharMenuAdmin() {
    definirMenuAdmin(false);
}

function ouvir(id, evento, handler) {
    const alvo = document.getElementById(id);
    if (!alvo) {
        console.warn(`Elemento administrativo ausente: #${id}`);
        return;
    }
    alvo.addEventListener(evento, handler);
}

["buscaAdminEmpresa", "buscaAdminUsuario", "buscaAdminCupom"].forEach((id) => {
    ouvir(id, "input", ({ target }) => ({
        buscaAdminEmpresa: renderizarEmpresas, buscaAdminUsuario: renderizarUsuarios,
        buscaAdminCupom: renderizarCupons
    })[target.id]());
});
["buscaAdminPedido", "filtroPedidoEmpresa", "filtroPedidoStatus", "filtroPedidoPagamento", "filtroPedidoInicio", "filtroPedidoFim"].forEach((id) => {
    ouvir(id, id === "buscaAdminPedido" ? "input" : "change", () => { paginaPedidos = 1; renderizarPedidos(); });
});
ouvir("limparFiltrosPedido", "click", () => {
    ["buscaAdminPedido", "filtroPedidoEmpresa", "filtroPedidoStatus", "filtroPedidoPagamento", "filtroPedidoInicio", "filtroPedidoFim"].forEach((id) => { document.getElementById(id).value = ""; });
    paginaPedidos = 1; renderizarPedidos();
});
ouvir("pedidosAnterior", "click", () => { paginaPedidos -= 1; renderizarPedidos(); });
ouvir("pedidosProxima", "click", () => { paginaPedidos += 1; renderizarPedidos(); });
ouvir("exportarPedidos", "click", () => baixarCsv(linhasCsv(pedidosFiltrados()), `multi-delivery-pedidos-filtrados-${new Date().toISOString().slice(0, 10)}.csv`));
ouvir("novoCupom", "click", () => abrirFormularioCupom());
ouvir("periodoRelatorio", "change", carregarRelatorio);
ouvir("exportarRelatorio", "click", exportarRelatorioCsv);
ouvir("adminFontSize", "change", ({ target }) => aplicarTamanhoFonte(target.value));
ouvir("adminMenu", "click", () => {
    const aberto = !adminSidebar?.classList.contains("open");
    definirMenuAdmin(aberto);
});
adminOverlay?.addEventListener("click", fecharMenuAdmin);
window.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && adminSidebar?.classList.contains("open")) {
        fecharMenuAdmin();
    }
});
window.addEventListener("resize", () => {
    if (window.innerWidth > 760 && adminSidebar?.classList.contains("open")) {
        fecharMenuAdmin();
    }
});
document.querySelectorAll("[data-modal-close]").forEach((item) => item.addEventListener("click", () => fecharModal(false)));
modal?.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") { fecharModal(false); return; }
    if (evento.key !== "Tab") return;
    const focaveis = [...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter((item) => item.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0]; const ultimo = focaveis.at(-1);
    if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
});
document.addEventListener("keydown", (evento) => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        mostrarSecaoAdmin("pedidos", { atualizarHistorico: true, focar: true });
        document.getElementById("buscaAdminPedido").focus();
    }
});
ouvir("adminLogout", "click", async () => { await db.auth.signOut(); App.limparDadosPrivados(); location.replace("login.html"); });
addEventListener("beforeunload", () => { clearTimeout(recarregarTimer); if (canalAdmin) db.removeChannel(canalAdmin); });
configurarNavegacao();
iniciarAdmin();
