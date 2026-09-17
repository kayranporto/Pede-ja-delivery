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
            async restaurantes({ limite = 50, offset = 0, categoria, cidade } = {}) {
                const params = new URLSearchParams({
                    limite: String(Math.min(Math.max(Number(limite) || 50, 1), 50)),
                    offset: String(Math.max(Number(offset) || 0, 0))
                });
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
            async meusEnderecos() {
                const data = await apiRequest("/v1/me/enderecos");
                return Array.isArray(data) ? data : [];
            },
            async meusPedidos() {
                const data = await apiRequest("/v1/me/pedidos");
                return Array.isArray(data) ? data : [];
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
