"use strict";

const SUPABASE_URL = "https://wzxsjxdbxonrmlmzufpv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MY-SAdXYgtX0euNoW4arHw_zlnZ3pcx";
const SUPABASE_PROJECT_REF = "wzxsjxdbxonrmlmzufpv";

(() => {
    if (window.db) return;

    const mensagem = "Não foi possível conectar ao serviço de dados. Verifique a internet e tente novamente.";

    function clienteIndisponivel() {
        const resultado = () => ({ data: null, error: new Error(mensagem), count: 0 });
        let consulta;
        consulta = new Proxy({}, {
            get(_alvo, propriedade) {
                if (propriedade === "then") {
                    return (resolver) => Promise.resolve(resultado()).then(resolver);
                }
                return () => consulta;
            }
        });

        const respostaAuth = async () => resultado();
        return {
            indisponivel: true,
            from: () => consulta,
            rpc: respostaAuth,
            functions: { invoke: respostaAuth },
            auth: {
                getUser: async () => ({ data: { user: null }, error: new Error(mensagem) }),
                getSession: async () => ({ data: { session: null }, error: new Error(mensagem) }),
                signUp: respostaAuth,
                signInWithPassword: respostaAuth,
                signOut: respostaAuth,
                resetPasswordForEmail: respostaAuth,
                updateUser: respostaAuth
            }
        };
    }

    try {
        if (!window.supabase?.createClient) throw new Error("Biblioteca do Supabase não carregada.");
        if (!SUPABASE_URL.includes(`://${SUPABASE_PROJECT_REF}.supabase.co`)) {
            throw new Error("A URL do Supabase não corresponde ao projeto configurado.");
        }
        window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        const API_BASE = `${SUPABASE_URL}/functions/v1/api-completa`;

        async function apiRequest(path, options = {}) {
            const headers = new Headers(options.headers || {});
            headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
            headers.set("Accept", "application/json");
            if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

            try {
                const { data } = await window.db.auth.getSession();
                const token = data?.session?.access_token;
                if (token) headers.set("Authorization", `Bearer ${token}`);
            } catch (erro) {
                console.warn("Sessão não pôde ser consultada antes da chamada à API.", erro);
            }

            const resposta = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers,
                credentials: "omit"
            });
            const payload = await resposta.json().catch(() => null);
            if (!resposta.ok) {
                const erro = new Error(payload?.error?.message || `Falha HTTP ${resposta.status}`);
                erro.code = payload?.error?.code || "api_error";
                erro.status = resposta.status;
                throw erro;
            }
            return payload?.data;
        }

        window.DeliveryAPI = Object.freeze({
            baseUrl: API_BASE,
            request: apiRequest,
            async restaurantes({ limite = 50, offset = 0, categoria, cidade, ids } = {}) {
                const params = new URLSearchParams({
                    limite: String(Math.min(Math.max(Number(limite) || 50, 1), 50)),
                    offset: String(Math.max(Number(offset) || 0, 0))
                });
                if (Array.isArray(ids) && ids.length) params.set("ids", ids.map(String).join(","));
                if (categoria) params.set("categoria", String(categoria));
                if (cidade) params.set("cidade", String(cidade));
                const data = await apiRequest(`/v1/restaurantes?${params}`);
                return Array.isArray(data) ? data : [];
            },
            async cardapio(empresaId) {
                return apiRequest(`/v1/restaurantes/${encodeURIComponent(String(empresaId))}/cardapio`);
            },
            async disponibilidade(empresaId, quando = new Date().toISOString()) {
                return apiRequest(`/v1/restaurantes/${encodeURIComponent(String(empresaId))}/disponibilidade?quando=${encodeURIComponent(quando)}`);
            },
            async avaliacoesResumo(empresaId) {
                return apiRequest(`/v1/restaurantes/${encodeURIComponent(String(empresaId))}/avaliacoes-resumo`);
            },
            async avaliacoesResumoTodos() {
                return apiRequest("/v1/avaliacoes-resumo");
            },
            async avaliacoes(empresaId, limite = 9) {
                return apiRequest(`/v1/restaurantes/${encodeURIComponent(String(empresaId))}/avaliacoes?limite=${Math.min(Math.max(Number(limite) || 9, 1), 50)}`);
            },
            async criarPedido(body) {
                return apiRequest("/v1/pedidos", { method: "POST", body: JSON.stringify(body) });
            },
            async calcularEntrega(body) {
                return apiRequest("/v1/entrega/calcular", { method: "POST", body: JSON.stringify(body) });
            },
            async getMe() {
                return apiRequest("/v1/me");
            },
            async atualizarMe(perfil) {
                return apiRequest("/v1/me", { method: "PATCH", body: JSON.stringify(perfil || {}) });
            },
            async meusEnderecos() {
                const data = await apiRequest("/v1/me/enderecos");
                return Array.isArray(data) ? data : [];
            },
            async meusPedidos() {
                const data = await apiRequest("/v1/me/pedidos");
                return Array.isArray(data) ? data : [];
            },
            async selecionarEndereco(enderecoId) {
                return apiRequest("/v1/enderecos/principal", { method: "POST", body: JSON.stringify({ endereco_id: String(enderecoId) }) });
            },
            async validarCupom(codigo, empresaId) {
                return apiRequest("/v1/cupons/validar", { method: "POST", body: JSON.stringify({ codigo: String(codigo), empresa_id: String(empresaId) }) });
            },
            async minhasAvaliacao(pedidoId) {
                return apiRequest("/v1/pedidos/" + encodeURIComponent(String(pedidoId)) + "/avaliacao");
            },
            async salvarAvaliacao(pedidoId, nota, comentario) {
                return apiRequest("/v1/pedidos/" + encodeURIComponent(String(pedidoId)) + "/avaliacao", { method: "POST", body: JSON.stringify({ nota, comentario: comentario || null }) });
            },
            async pedidoDetalhe(pedidoId) {
                const data = await apiRequest("/v1/pedidos/" + encodeURIComponent(String(pedidoId)));
                return Array.isArray(data) ? (data[0] || null) : data || null;
            },
            async pedidoMensagens(pedidoId) {
                const data = await apiRequest("/v1/pedidos/" + encodeURIComponent(String(pedidoId)) + "/mensagens");
                return Array.isArray(data) ? data : [];
            },
            async pedidoLocalizacao(pedidoId) {
                return apiRequest("/v1/pedidos/" + encodeURIComponent(String(pedidoId)) + "/localizacao");
            },
            async meusSuportes() {
                const data = await apiRequest("/v1/me/suporte");
                return Array.isArray(data) ? data : [];
            },
            async minhasAvaliacoes() {
                const data = await apiRequest("/v1/me/avaliacoes");
                return Array.isArray(data) ? data : [];
            },
            async minhasNotificacoes() {
                const data = await apiRequest("/v1/me/notificacoes");
                return Array.isArray(data) ? data : [];
            },
            async resgatarFidelidade(empresaId) {
                return apiRequest("/v1/fidelidade/resgatar", { method: "POST", body: JSON.stringify({ empresa_id: String(empresaId) }) });
            },
            async empresaUnidades(empresaId) {
                const data = await apiRequest("/v1/empresa/unidades?empresa_id=" + encodeURIComponent(String(empresaId)));
                return Array.isArray(data) ? data : [];
            },
            async salvarEmpresaUnidade(payload) {
                return apiRequest("/v1/empresa/unidades", { method: "POST", body: JSON.stringify(payload || {}) });
            },
            async empresaOperacao(empresaId, unidadeId = "", financeiro = false, dias = 30) {
                const params = new URLSearchParams({ empresa_id: String(empresaId) });
                if (unidadeId) params.set("unidade_id", String(unidadeId));
                if (financeiro) { params.set("financeiro", "1"); params.set("dias", String(dias)); }
                return apiRequest("/v1/empresa/operacao?" + params);
            },
            async empresaOperacaoAcao(payload) {
                return apiRequest("/v1/empresa/operacao", { method: "POST", body: JSON.stringify(payload || {}) });
            },
            async empresaPainel(empresaId, unidadeId = "") {
                const params = new URLSearchParams({ empresa_id: String(empresaId) });
                if (unidadeId) params.set("unidade_id", String(unidadeId));
                return apiRequest("/v1/empresa/painel?" + params);
            },
            async empresaPainelAcao(payload) {
                return apiRequest("/v1/empresa/painel", { method: "POST", body: JSON.stringify(payload || {}) });
            },
            async empresaPlano() {
                return apiRequest("/v1/empresa/plano");
            },
            async empresaFuncionarios(empresaId) {
                const data = await apiRequest("/v1/empresa/funcionarios?empresa_id=" + encodeURIComponent(String(empresaId)));
                return Array.isArray(data) ? data : [];
            },
            async salvarFuncionario(empresaId, email, papel) {
                return apiRequest("/v1/empresa/funcionarios", { method: "POST", body: JSON.stringify({ empresa_id: String(empresaId), email: String(email), papel: String(papel) }) });
            },
            async removerFuncionario(empresaId, usuarioId) {
                return apiRequest("/v1/empresa/funcionarios/" + encodeURIComponent(String(usuarioId)) + "?empresa_id=" + encodeURIComponent(String(empresaId)), { method: "DELETE" });
            },
            async entregadorResumoGanhos() {
                return apiRequest("/v1/entregador/resumo");
            },
            async entregadorHistoricoGanhos(limite = 20, offset = 0) {
                const params = new URLSearchParams({ limite: String(Math.min(Math.max(Number(limite) || 20, 1), 200)), offset: String(Math.max(Number(offset) || 0, 0)) });
                const data = await apiRequest("/v1/entregador/ganhos?" + params);
                return Array.isArray(data) ? data : [];
            },
            async empresaImportacaoCatalogo(unidadeId) { return apiRequest("/v1/empresa/importacao/catalogo?unidade_id=" + encodeURIComponent(String(unidadeId))); },
            async importarProdutosCSV(payload) { return apiRequest("/v1/empresa/importacao", { method: "POST", body: JSON.stringify(payload || {}) }); },
            async empresaPedidoEventos(empresaId) { const data = await apiRequest("/v1/empresa/pedido-eventos?empresa_id=" + encodeURIComponent(String(empresaId))); return Array.isArray(data) ? data : []; },
            async disponibilidadeUnidade(empresaId, unidadeId, quando = new Date().toISOString()) { const params = new URLSearchParams({ quando }); return apiRequest("/v1/restaurantes/" + encodeURIComponent(String(empresaId)) + "/unidades/" + encodeURIComponent(String(unidadeId)) + "/disponibilidade?" + params); },
            async empresaCancelarPedido(pedidoId, motivo) { return apiRequest("/v1/empresa/pedido/cancelar", { method: "POST", body: JSON.stringify({ pedido_id: String(pedidoId), motivo: motivo || "" }) }); },
            async empresaDecidirCancelamento(pedidoId, aprovar, observacao = null) { return apiRequest("/v1/empresa/pedido/cancelamento", { method: "POST", body: JSON.stringify({ pedido_id: String(pedidoId), aprovar: aprovar === true, observacao }) }); },
            async empresaPagamentoOffline(pedidoId) { return apiRequest("/v1/empresa/pagamento-offline", { method: "POST", body: JSON.stringify({ pedido_id: String(pedidoId) }) }); },
            async empresaOperadorPedidos(empresaId, limite = 100) { const data = await apiRequest("/v1/empresa/pedidos?empresa_id=" + encodeURIComponent(String(empresaId)) + "&limite=" + encodeURIComponent(String(Math.min(Number(limite) || 100, 200)))); return Array.isArray(data) ? data : []; },
            async empresaRelatorioFinanceiroAcesso(empresaId, dias = 30) { return apiRequest("/v1/empresa/relatorios/financeiro-acesso?empresa_id=" + encodeURIComponent(String(empresaId)) + "&dias=" + encodeURIComponent(String(dias))); },
            async restauranteUnidadesPublicas(empresaId) { const data = await apiRequest("/v1/restaurantes/" + encodeURIComponent(String(empresaId)) + "/unidades"); return Array.isArray(data) ? data : []; },
            async empresaAtualizarOperacaoPedido(pedidoId, acao, preparo = null, observacao = null) { return apiRequest("/v1/empresa/pedidos/" + encodeURIComponent(String(pedidoId)) + "/operacao", { method: "POST", body: JSON.stringify({ acao, preparo_estimado: preparo, observacao }) }); },
            async marcarNotificacoesLidas(ids) { return apiRequest("/v1/me/notificacoes/lidas", { method: "POST", body: JSON.stringify({ ids: Array.isArray(ids) ? ids.map(String) : [] }) }); },
            async salvarPushSubscription(endpoint, subscription) { return apiRequest("/v1/me/push-subscription", { method: "POST", body: JSON.stringify({ endpoint: String(endpoint), subscription }) }); },
            async adminDashboard() { return apiRequest("/v1/admin/dashboard"); },
            async adminAcao(payload) { return apiRequest("/v1/admin/acao", { method: "POST", body: JSON.stringify(payload || {}) }); },
            async adminRelatorios(dias = 30) { return apiRequest("/v1/admin/acao", { method: "POST", body: JSON.stringify({ acao: "relatorios", dias }) }); },
            async adminDetalhePedido(pedidoId) { return apiRequest("/v1/admin/acao", { method: "POST", body: JSON.stringify({ acao: "pedido_detalhe", pedido_id: String(pedidoId) }) }); },
            async adminPlanos() {
                const data = await apiRequest("/v1/admin/planos");
                return Array.isArray(data) ? data : [];
            },
            async adminAssinaturas() {
                const data = await apiRequest("/v1/admin/assinaturas");
                return Array.isArray(data) ? data : [];
            },
            async adminEmpresas() {
                const data = await apiRequest("/v1/admin/empresas");
                return Array.isArray(data) ? data : [];
            },
            async adminSalvarPlano(plano) {
                return apiRequest("/v1/admin/planos", { method: "POST", body: JSON.stringify({ plano }) });
            },
            async adminSalvarAssinatura(payload) {
                return apiRequest("/v1/admin/assinaturas", { method: "POST", body: JSON.stringify(payload || {}) });
            },
            async adminOperacao() {
                return apiRequest("/v1/admin/operacao");
            },
            async adminResponderChamado(chamadoId, resposta, fechar = false) {
                return apiRequest("/v1/admin/chamados/responder", { method: "POST", body: JSON.stringify({ chamado_id: String(chamadoId), resposta: String(resposta), fechar: fechar === true }) });
            },
            async adminDecidirCancelamento(pedidoId, aprovar, observacao = null) {
                return apiRequest("/v1/admin/pedidos/cancelamento", { method: "POST", body: JSON.stringify({ pedido_id: String(pedidoId), aprovar: aprovar === true, observacao }) });
            },
            async adminProcessarReembolso(pedidoId) {
                return apiRequest("/v1/admin/reembolso/processar", { method: "POST", body: JSON.stringify({ pedido_id: String(pedidoId) }) });
            },
            async salvarEndereco(endereco) {
                return apiRequest("/v1/me/enderecos", { method: "POST", body: JSON.stringify(endereco) });
            },
            async removerEndereco(enderecoId) {
                return apiRequest("/v1/enderecos/" + encodeURIComponent(String(enderecoId)), { method: "DELETE" });
            },
            async criarSuporte(body) {
                return apiRequest("/v1/suporte", { method: "POST", body: JSON.stringify(body) });
            },
            async meusFavoritos() {
                const data = await apiRequest("/v1/me/favoritos");
                return Array.isArray(data) ? data : [];
            },
            async adicionarFavorito(empresaId) {
                return apiRequest("/v1/favoritos", { method: "POST", body: JSON.stringify({ empresa_id: String(empresaId) }) });
            },
            async removerFavorito(empresaId) {
                return apiRequest("/v1/favoritos/" + encodeURIComponent(String(empresaId)), { method: "DELETE" });
            },
            async minhaFidelidade() {
                const data = await apiRequest("/v1/me/fidelidade");
                return Array.isArray(data) ? data : [];
            },
            async entregadorMe() {
                return apiRequest("/v1/entregador/me");
            },
            async entregasEntregador() {
                const data = await apiRequest("/v1/entregador/entregas");
                return Array.isArray(data) ? data : [];
            },
            async pedidosEntregador() {
                const data = await apiRequest("/v1/entregador/pedidos");
                return Array.isArray(data) ? data : [];
            },
            async definirEntregadorOnline(online) {
                return apiRequest("/v1/entregador/status", {
                    method: "POST",
                    body: JSON.stringify({ online: online === true })
                });
            },
            async aceitarEntrega(pedidoId) {
                return apiRequest("/v1/entregador/pedidos/" + encodeURIComponent(String(pedidoId)) + "/aceitar", {
                    method: "POST",
                    body: JSON.stringify({})
                });
            },
            async atualizarStatusEntregador(pedidoId, status, pagamentoRecebido = false) {
                return apiRequest("/v1/entregador/pedidos/" + encodeURIComponent(String(pedidoId)) + "/status", {
                    method: "POST",
                    body: JSON.stringify({ status, pagamento_recebido: pagamentoRecebido })
                });
            },
            async atualizarLocalizacaoEntregador(pedidoId, latitude, longitude, precisaoMetros = null) {
                const rota = pedidoId
                    ? "/v1/entregador/pedidos/" + encodeURIComponent(String(pedidoId)) + "/localizacao"
                    : "/v1/entregador/localizacao";
                return apiRequest(rota, {
                    method: "POST",
                    body: JSON.stringify({ latitude, longitude, precisao_metros: precisaoMetros })
                });
            },
            async listarEntregadoresEmpresa(unidadeId) {
                return apiRequest("/v1/empresa/entregadores?unidade_id=" + encodeURIComponent(String(unidadeId)));
            },
            async vincularEntregadorEmpresa(unidadeId, email) {
                return apiRequest("/v1/empresa/entregadores", {
                    method: "POST",
                    body: JSON.stringify({ unidade_id: String(unidadeId), email: String(email) })
                });
            },
            async removerEntregadorEmpresa(unidadeId, entregadorId) {
                return apiRequest("/v1/empresa/entregadores/" + encodeURIComponent(String(entregadorId)) + "?unidade_id=" + encodeURIComponent(String(unidadeId)), {
                    method: "DELETE"
                });
            }
        });
    } catch (erro) {
        console.error(erro);
        window.db = clienteIndisponivel();
        window.App?.mostrarErroPagina(mensagem);
    }
})();
