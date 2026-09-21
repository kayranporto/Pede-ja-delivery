import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.111.0";

const API_VERSION = "3.0.0";
const METHODS = ["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const PUBLIC_PREFIXES = [
  /^\/$/, /^\/v1\/?$/, /^\/v1\/status\/?$/,
  /^\/v1\/restaurantes\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/cardapio\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/unidades\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/disponibilidade\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/unidades\/[^/]+\/disponibilidade\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/avaliacoes-resumo\/?$/,
  /^\/v1\/restaurantes\/[^/]+\/avaliacoes\/?$/,
  /^\/v1\/avaliacoes-resumo\/?$/,
];
const RESTAURANT_FIELDS = "id,nome,descricao,categoria,tipo,logo,banner,taxa_entrega,pedido_minimo,status,cidade_atendimento,uf_atendimento,bairros_atendidos,tempo_estimado_min,tempo_estimado_max";

type Json = Record<string, unknown>;
type RouteContext = { request: Request; url: URL; path: string; db: SupabaseClient; userId: string | null };

function cors(request: Request) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("SITE_URL") || "")
    .split(",").map((v: string) => v.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  const allowed = new Set([
    ...configured,
    "https://kayranporto.github.io",
    "https://site-delivery-42.vercel.app",
  ]);
  return {
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : (configured.length === 0 ? "*" : ""),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": METHODS.join(", "),
    "Vary": "Origin",
  };
}
function response(request: Request, body: Json | null, status = 200, cache = "no-store") {
  const id = request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  return new Response(request.method === "HEAD" ? null : JSON.stringify(body ? { ...body, request_id: id } : null), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "X-API-Version": API_VERSION, "X-Request-Id": id, "X-Content-Type-Options": "nosniff" },
  });
}
function error(request: Request, status: number, code: string, message: string, details?: unknown) { return response(request, { error: { code, message, ...(details === undefined ? {} : { details }) } }, status); }
function pathOf(request: Request) { const p = new URL(request.url).pathname.replace(/\/+$/, "") || "/"; const marker = "/api-completa"; const i = p.indexOf(marker); return i >= 0 ? (p.slice(i + marker.length) || "/") : p; }
function uuid(value: string | undefined) { return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function bodyJson(request: Request) { return request.json().catch(() => null) as Promise<Json | null>; }
function str(value: unknown, max = 5000) { return typeof value === "string" && value.trim().length <= max ? value.trim() : null; }
function int(value: unknown, min = 1, max = 100) { const n = typeof value === "number" ? value : Number(value); return Number.isInteger(n) && n >= min && n <= max ? n : null; }
function client(request: Request) { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY"); if (!url || !key) return null; const authorization = request.headers.get("authorization") || undefined; return createClient(url, key, { global: { headers: authorization ? { Authorization: authorization } : {} }, auth: { persistSession: false, autoRefreshToken: false } }); }
async function authUser(db: SupabaseClient) { const { data, error: e } = await db.auth.getUser(); return e || !data.user ? null : data.user; }
function isPublic(path: string) { return PUBLIC_PREFIXES.some(re => re.test(path)); }
async function rpc(db: SupabaseClient, request: Request, name: string, args: Json = {}) { const { data, error: dbError } = await db.rpc(name, args); if (dbError) { console.error("RPC failure", { name, code: dbError.code }); return error(request, 400, "operacao_recusada", dbError.message || "A operação não pôde ser concluída."); } return response(request, { data }); }
async function publicRestaurants(ctx: RouteContext) { 
  const idsParam = str(ctx.url.searchParams.get("ids"), 10000);
  if (idsParam !== null) {
    const rawIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (!rawIds.length || rawIds.length > 200 || rawIds.some((id) => !uuid(id))) return error(ctx.request, 400, "parametro_invalido", "ids deve conter até 200 UUIDs separados por vírgula.");
    const ids = [...new Set(rawIds)];
    const { data, error: e } = await ctx.db.from("empresas_catalogo").select(RESTAURANT_FIELDS).eq("status", true).in("id", ids).order("nome");
    if (e) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os restaurantes.");
    return response(ctx.request, { data: data || [], meta: { limite: ids.length, offset: 0, total: (data || []).length } }, 200, "public, max-age=30, stale-while-revalidate=60");
  }
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limite") || 20), 1), 50); 
  const offset = Math.min(Math.max(Number(ctx.url.searchParams.get("offset") || 0), 0), 10000); 
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) return error(ctx.request, 400, "parametro_invalido", "Paginação inválida."); 
  let q = ctx.db.from("empresas_catalogo").select(RESTAURANT_FIELDS, { count: "exact" }).eq("status", true).order("nome").range(offset, offset + limit - 1); 
  const categoria = str(ctx.url.searchParams.get("categoria"), 80); 
  const cidade = str(ctx.url.searchParams.get("cidade"), 120); 
  if (ctx.url.searchParams.has("categoria") && categoria === null) return error(ctx.request, 400, "parametro_invalido", "Categoria inválida."); 
  if (ctx.url.searchParams.has("cidade") && cidade === null) return error(ctx.request, 400, "parametro_invalido", "Cidade inválida."); 
  if (categoria) q = q.eq("categoria", categoria); 
  if (cidade) q = q.eq("cidade_atendimento", cidade); 
  const { data, error: e, count } = await q; 
  if (e) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os restaurantes."); 
  return response(ctx.request, { data: data || [], meta: { limite: limit, offset, total: count || 0 } }, 200, "public, max-age=30, stale-while-revalidate=60"); 
}
async function menu(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const { data: restaurant, error: re } = await ctx.db.from("empresas_catalogo").select(RESTAURANT_FIELDS).eq("id", id).eq("status", true).maybeSingle(); if (re) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante."); if (!restaurant) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado."); const [cats, products, groups] = await Promise.all([ctx.db.from("categorias").select("id,nome,ordem,unidade_id").eq("empresa_id", id).eq("ativo", true).order("ordem").order("nome"), ctx.db.from("produtos").select("id,categoria_id,nome,descricao,imagem,preco,promocao,unidade_id").eq("empresa_id", id).eq("disponivel", true).order("nome"), ctx.db.from("grupos_adicionais").select("id,nome,minimo,maximo").eq("empresa_id", id).eq("ativo", true).order("nome")]); const first = cats.error || products.error || groups.error; if (first) return error(ctx.request, 502, "falha_cardapio", "Não foi possível carregar o cardápio."); const productIds = (products.data || []).map((p: any) => String(p.id)); const groupIds = (groups.data || []).map((g: any) => String(g.id)); const [variants, links, additions] = await Promise.all([productIds.length ? ctx.db.from("produto_variantes").select("id,produto_id,nome,preco,promocao,ordem").in("produto_id", productIds).eq("ativo", true).order("ordem") : Promise.resolve({ data: [], error: null }), productIds.length ? ctx.db.from("produto_grupos").select("produto_id,grupo_id").in("produto_id", productIds) : Promise.resolve({ data: [], error: null }), groupIds.length ? ctx.db.from("adicionais").select("id,grupo_id,nome,preco").in("grupo_id", groupIds).eq("ativo", true).order("nome") : Promise.resolve({ data: [], error: null })]); const related = variants.error || links.error || additions.error; if (related) return error(ctx.request, 502, "falha_cardapio", "Não foi possível carregar os complementos."); const vp = new Map<string, unknown[]>(), gp = new Map<string, string[]>(), ag = new Map<string, unknown[]>(); for (const x of (variants.data || []) as any[]) vp.set(String(x.produto_id), [...(vp.get(String(x.produto_id)) || []), x]); for (const x of (links.data || []) as any[]) gp.set(String(x.produto_id), [...(gp.get(String(x.produto_id)) || []), String(x.grupo_id)]); for (const x of (additions.data || []) as any[]) ag.set(String(x.grupo_id), [...(ag.get(String(x.grupo_id)) || []), x]); return response(ctx.request, { data: { restaurante: restaurant, categorias: cats.data || [], produtos: (products.data || []).map((p: any) => ({ ...p, variantes: vp.get(String(p.id)) || [], grupos_adicionais: gp.get(String(p.id)) || [] })), grupos_adicionais: (groups.data || []).map((g: any) => ({ ...g, adicionais: ag.get(String(g.id)) || [] })) } }, 200, "public, max-age=30, stale-while-revalidate=60"); }
async function unitAvailability(ctx: RouteContext, empresaId: string, unidadeId: string) {
  if (!uuid(empresaId) || !uuid(unidadeId)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante ou da unidade inválido.");
  const restaurant = await ctx.db.from("empresas_catalogo").select("id,status").eq("id", empresaId).eq("status", true).maybeSingle();
  if (restaurant.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante.");
  if (!restaurant.data) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado.");
  const quando = ctx.url.searchParams.get("quando") || new Date().toISOString();
  const { data, error: e } = await ctx.db.rpc("empresa_disponibilidade_unidade", { p_empresa_id: empresaId, p_unidade_id: unidadeId, p_quando: quando });
  if (e) return error(ctx.request, 502, "falha_disponibilidade", "Não foi possível consultar a disponibilidade da unidade.");
  return response(ctx.request, { data: data || { aberto: false } }, 200, "public, max-age=15, stale-while-revalidate=30");
}
async function availability(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const restaurant = await ctx.db.from("empresas_catalogo").select("id,status").eq("id", id).eq("status", true).maybeSingle(); if (restaurant.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante."); if (!restaurant.data) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado."); const quando = ctx.url.searchParams.get("quando") || new Date().toISOString(); const { data, error: e } = await ctx.db.rpc("empresa_disponibilidade", { p_empresa_id: id, p_quando: quando }); if (e) return error(ctx.request, 502, "falha_disponibilidade", "Não foi possível consultar a disponibilidade."); return response(ctx.request, { data: data || { aberto: false } }, 200, "public, max-age=15, stale-while-revalidate=30"); }
async function reviewsSummary(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const { data, error: e } = await ctx.db.from("avaliacoes_resumo").select("empresa_id,quantidade_avaliacoes,nota_media").eq("empresa_id", id).maybeSingle(); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar o resumo das avaliações."); return response(ctx.request, { data: data || { empresa_id: id, quantidade_avaliacoes: 0, nota_media: 0 } }, 200, "public, max-age=60, stale-while-revalidate=120"); }
async function reviewsSummaryAll(ctx: RouteContext) { const { data, error: e } = await ctx.db.from("avaliacoes_resumo").select("empresa_id,quantidade_avaliacoes,nota_media"); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar os resumos das avaliações."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=60, stale-while-revalidate=120"); }
async function reviews(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limite") || 9), 1), 50); const { data, error: e } = await ctx.db.from("avaliacoes").select("id,nota,comentario,resposta,autor_nome,autor_avatar_url,created_at").eq("empresa_id", id).order("created_at", { ascending: false }).limit(limit); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar as avaliações."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=30, stale-while-revalidate=60"); }
async function publicHighlights(ctx: RouteContext) { const restaurantQuery = await ctx.db.from("empresas_catalogo").select("id").eq("status", true).order("nome").limit(20); if (restaurantQuery.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os destaques."); const ids = (restaurantQuery.data || []).map((item: any) => String(item.id)); if (!ids.length) return response(ctx.request, { data: [] }, 200, "public, max-age=30, stale-while-revalidate=60"); const { data, error: e } = await ctx.db.from("produtos").select("id,nome,descricao,imagem,preco,promocao,empresa_id").in("empresa_id", ids).eq("disponivel", true).order("nome").limit(6); if (e) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os produtos em destaque."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=30, stale-while-revalidate=60"); }
async function loyalty(ctx: RouteContext) { const result=await ctx.db.rpc("meus_beneficios_fidelidade"); if(result.error) return error(ctx.request,502,"fidelidade_indisponivel","Não foi possível consultar a fidelidade."); const saldos=result.data||[]; const ids=saldos.map((item:any)=>String(item.empresa_id)).filter(Boolean); const empresas=ids.length?await ctx.db.from("empresas_catalogo").select("id,nome").in("id",ids):{data:[],error:null}; if(empresas.error) return error(ctx.request,502,"fidelidade_indisponivel","Não foi possível carregar os restaurantes da fidelidade."); const nomes=new Map((empresas.data||[]).map((item:any)=>[String(item.id),item.nome])); return response(ctx.request,{data:saldos.map((item:any)=>({...item,empresa_nome:nomes.get(String(item.empresa_id))||"Restaurante"}))}); }
async function companyUnits(ctx: RouteContext) {
  const empresaId = str(ctx.url.searchParams.get("empresa_id"), 100);
  if (!empresaId) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório.");
  const { data, error: e } = await ctx.db.from("empresa_unidades")
    .select("id,empresa_id,nome,slug,endereco,cidade,uf,telefone,ativa,principal,latitude,longitude,localizacao_atualizada_em,frete_distancia_ativo,frete_taxa_base,frete_valor_km,frete_raio_max_km,created_at,updated_at")
    .eq("empresa_id", empresaId)
    .order("principal", { ascending: false })
    .order("nome", { ascending: true });
  return e ? error(ctx.request, 502, "unidades_indisponiveis", "Não foi possível carregar as unidades.") : response(ctx.request, { data: data || [] });
}
async function companyOperation(ctx: RouteContext) {
  const empresaId = str(ctx.url.searchParams.get("empresa_id"), 100);
  const unidadeId = str(ctx.url.searchParams.get("unidade_id"), 100);
  if (!empresaId) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório.");
  const unitFilter = (q: any) => unidadeId ? q.eq("unidade_id", unidadeId) : q;
  const [horariosQ, pausasQ, regioesQ, cancelamentosQ, fidelidadeQ, pedidosQ, produtosQ, categoriasQ] = await Promise.all([
    unitFilter(ctx.db.from("empresa_horarios").select("*").eq("empresa_id", empresaId).order("dia_semana")),
    unitFilter(ctx.db.from("empresa_pausas").select("*").eq("empresa_id", empresaId).order("inicio")),
    unitFilter(ctx.db.from("empresa_regioes").select("*").eq("empresa_id", empresaId).order("bairro")),
    ctx.db.from("pedidos").select("id,numero,cliente_nome,cancelamento_motivo,cancelamento_status,pagamento_modalidade,pagamento_status,total").eq("empresa_id", empresaId).eq("cancelamento_status", "solicitado").order("cancelamento_solicitado_em"),
    ctx.db.from("programa_fidelidade_empresa").select("*").eq("empresa_id", empresaId).maybeSingle(),
    unidadeId ? ctx.db.from("pedidos").select("*, pedido_itens(*)").eq("empresa_id", empresaId).eq("unidade_id", unidadeId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    unidadeId ? ctx.db.from("produtos").select("*").eq("empresa_id", empresaId).eq("unidade_id", unidadeId).order("nome") : Promise.resolve({ data: [], error: null }),
    unidadeId ? ctx.db.from("categorias").select("*").eq("empresa_id", empresaId).eq("unidade_id", unidadeId).order("ordem").order("nome") : Promise.resolve({ data: [], error: null })
  ]);
  const primeiroErro = horariosQ.error || pausasQ.error || regioesQ.error || cancelamentosQ.error || fidelidadeQ.error || pedidosQ.error || produtosQ.error || categoriasQ.error;
  if (primeiroErro) return error(ctx.request, 502, "operacao_indisponivel", "Não foi possível carregar a operação da empresa.");
  let disponibilidade = null;
  try {
    const rpcNome = unidadeId ? "empresa_disponibilidade_unidade" : "empresa_disponibilidade";
    const args = unidadeId
      ? { p_empresa_id: empresaId, p_unidade_id: unidadeId, p_quando: new Date().toISOString() }
      : { p_empresa_id: empresaId, p_quando: new Date().toISOString() };
    const r = await ctx.db.rpc(rpcNome, args);
    if (!r.error) disponibilidade = r.data || { aberto: false };
  } catch { disponibilidade = null; }
  const financeiro = ctx.url.searchParams.get("financeiro") === "1"
    ? await ctx.db.rpc("empresa_relatorio_financeiro", { p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) })
    : { data: null, error: null };
  if (financeiro.error) return error(ctx.request, 502, "financeiro_indisponivel", "Não foi possível carregar o financeiro.");
  return response(ctx.request, { data: {
    horarios: horariosQ.data || [],
    pausas: pausasQ.data || [],
    regioes: regioesQ.data || [],
    cancelamentos: cancelamentosQ.data || [],
    fidelidade: fidelidadeQ.data || {},
    pedidos: pedidosQ.data || [],
    produtos: produtosQ.data || [],
    categorias: categoriasQ.data || [],
    disponibilidade,
    financeiro: financeiro.data || null
  }});
}
async function companyUnitSave(ctx: RouteContext, body: Json) {
  const empresaId = str(body.empresa_id, 100), unidadeId = str(body.unidade_id, 100);
  const payload = body.payload && typeof body.payload === "object" ? body.payload as Json : {};
  if (!empresaId) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório.");
  if (unidadeId && !uuid(unidadeId)) return error(ctx.request, 400, "parametro_invalido", "unidade_id inválido.");
  const clean: Json = {
    empresa_id: empresaId,
    nome: str(payload.nome, 100),
    slug: str(payload.slug, 100),
    endereco: str(payload.endereco, 220),
    cidade: str(payload.cidade, 100),
    uf: str(payload.uf, 2),
    telefone: str(payload.telefone, 30),
    ativa: typeof payload.ativa === "boolean" ? payload.ativa : undefined,
    principal: typeof payload.principal === "boolean" ? payload.principal : undefined,
    latitude: Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : undefined,
    longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : undefined,
    frete_distancia_ativo: typeof payload.frete_distancia_ativo === "boolean" ? payload.frete_distancia_ativo : undefined,
    frete_taxa_base: Number.isFinite(Number(payload.frete_taxa_base)) ? Number(payload.frete_taxa_base) : undefined,
    frete_valor_km: Number.isFinite(Number(payload.frete_valor_km)) ? Number(payload.frete_valor_km) : undefined,
    frete_raio_max_km: Number.isFinite(Number(payload.frete_raio_max_km)) ? Number(payload.frete_raio_max_km) : undefined
  };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  if (!clean.nome) return error(ctx.request, 400, "parametro_invalido", "nome é obrigatório.");
  const q = unidadeId
    ? ctx.db.from("empresa_unidades").update(clean).eq("id", unidadeId).eq("empresa_id", empresaId).select("*").single()
    : ctx.db.from("empresa_unidades").insert({ ...clean, slug: clean.slug || "unidade-" + Date.now(), ativa: clean.ativa ?? true, principal: clean.principal ?? false }).select("*").single();
  const { data, error: e } = await q;
  if (e) return error(ctx.request, e.code === "23505" ? 409 : 400, e.code === "23505" ? "unidade_duplicada" : "unidade_recusada", e.message || "Não foi possível salvar a unidade.");
  return response(ctx.request, { data });
}
async function companyOperationAction(ctx: RouteContext, body: Json) {
  const acao = str(body.acao, 50), empresaId = str(body.empresa_id, 100); let unidadeId = str(body.unidade_id, 100);
  if (!acao || !empresaId) return error(ctx.request, 400, "parametro_invalido", "acao e empresa_id são obrigatórios.");
  if (unidadeId && !uuid(unidadeId)) return error(ctx.request, 400, "parametro_invalido", "unidade_id inválido.");
  if (!unidadeId && ["horarios","pausa_criar","pausa_remover","regiao_criar","regiao_toggle","regiao_remover","categoria_criar","produto_salvar"].includes(acao)) {
    const principal = await ctx.db.from("empresa_unidades").select("id").eq("empresa_id", empresaId).eq("principal", true).eq("ativa", true).maybeSingle();
    if (principal.error || !principal.data?.id) return error(ctx.request, 400, "unidade_indisponivel", "A empresa não possui unidade principal ativa.");
    unidadeId = String(principal.data.id);
  }
  const unit = (q: any) => q.eq("empresa_id", empresaId).eq("unidade_id", unidadeId);
  if (acao === "categoria_criar") {
    if (!unidadeId) return error(ctx.request,400,"parametro_invalido","unidade_id é obrigatório.");
    const nome = str(body.nome,120);
    if (!nome) return error(ctx.request,400,"parametro_invalido","nome é obrigatório.");
    const { data, error: e } = await unit(ctx.db.from("categorias").insert({ empresa_id: empresaId, unidade_id: unidadeId, nome, ordem: Number(body.ordem ?? 0), ativo: true }).select("*").single());
    return e ? error(ctx.request,e.code==="23505"?409:400,e.code==="23505"?"categoria_duplicada":"categoria_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "produto_salvar") {
    if (!unidadeId) return error(ctx.request,400,"parametro_invalido","unidade_id é obrigatório.");
    const id = str(body.id,100);
    const payload = {
      empresa_id: empresaId, unidade_id: unidadeId, categoria_id: str(body.categoria_id,100) || null,
      nome: str(body.nome,160), descricao: str(body.descricao,2000) || null, imagem: str(body.imagem,1000) || null,
      preco: Number(body.preco), promocao: body.promocao === null || body.promocao === undefined || body.promocao === "" ? null : Number(body.promocao),
      disponivel: body.disponivel !== false, controle_estoque: body.controle_estoque === true,
      estoque: Number(body.estoque || 0), estoque_minimo: Number(body.estoque_minimo || 0)
    };
    if (!payload.nome || !Number.isFinite(payload.preco) || payload.preco < 0 || !Number.isInteger(payload.estoque) || payload.estoque < 0 || !Number.isInteger(payload.estoque_minimo) || payload.estoque_minimo < 0) return error(ctx.request,400,"produto_invalido","Dados do produto inválidos.");
    if (payload.promocao !== null && (!Number.isFinite(payload.promocao) || payload.promocao <= 0 || payload.promocao >= payload.preco)) return error(ctx.request,400,"produto_invalido","Preço promocional inválido.");
    const q = id ? unit(ctx.db.from("produtos").update(payload).eq("id",id).select("*").single()) : ctx.db.from("produtos").insert(payload).select("*").single();
    const { data, error: e } = await q;
    return e ? error(ctx.request,400,"produto_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "horarios") {
    if (!unidadeId || !Array.isArray(body.registros)) return error(ctx.request, 400, "parametro_invalido", "unidade_id e registros são obrigatórios.");
    const registros = body.registros.map((r: any) => ({ empresa_id: empresaId, unidade_id: unidadeId, dia_semana: int(r.dia_semana, 0, 6), ativo: r.ativo !== false, abre: str(r.abre, 8), fecha: str(r.fecha, 8), updated_at: new Date().toISOString() }));
    if (registros.some((r: any) => r.dia_semana === null || !r.abre || !r.fecha)) return error(ctx.request, 400, "horarios_invalidos", "Há horários inválidos no envio.");
    const { data, error: e } = await ctx.db.from("empresa_horarios").upsert(registros, { onConflict: "empresa_id,unidade_id,dia_semana" }).select("*");
    return e ? error(ctx.request, 400, "horarios_recusados", e.message) : response(ctx.request, { data: data || [] });
  }
  if (!unidadeId && ["pausa_criar","pausa_remover","regiao_criar","regiao_toggle","regiao_remover"].includes(acao)) return error(ctx.request, 400, "parametro_invalido", "unidade_id é obrigatório para esta operação.");
  if (acao === "pausa_criar") {
    const inicio = str(body.inicio, 80), fim = str(body.fim, 80);
    if (!inicio || !fim || !Number.isFinite(new Date(inicio).getTime()) || !Number.isFinite(new Date(fim).getTime()) || new Date(fim) <= new Date(inicio)) return error(ctx.request, 400, "pausa_invalida", "Início e fim da pausa são inválidos.");
    const { data, error: e } = await unit(ctx.db.from("empresa_pausas").insert({ empresa_id: empresaId, unidade_id: unidadeId, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), motivo: str(body.motivo, 500) || null }).select("*").single());
    return e ? error(ctx.request, 400, "pausa_recusada", e.message) : response(ctx.request, { data });
  }
  if (acao === "pausa_remover") {
    const id = str(body.id, 100); if (!uuid(id)) return error(ctx.request, 400, "parametro_invalido", "id da pausa inválido.");
    const { error: e } = await unit(ctx.db.from("empresa_pausas").delete().eq("id", id));
    return e ? error(ctx.request, 400, "pausa_recusada", e.message) : response(ctx.request, { data: true });
  }
  if (acao === "regiao_criar") {
    if (!str(body.bairro, 160) || !str(body.cidade, 100) || !/^[A-Za-z]{2}$/.test(String(body.uf || ""))) return error(ctx.request, 400, "regiao_invalida", "Região incompleta.");
    const payload = { empresa_id: empresaId, unidade_id: unidadeId, bairro: str(body.bairro,160), cidade: str(body.cidade,100), uf: str(body.uf,2)?.toUpperCase(), taxa_entrega: Number(body.taxa_entrega), pedido_minimo: Number(body.pedido_minimo), tempo_min: Number(body.tempo_min), tempo_max: Number(body.tempo_max), ativo: true };
    if (![payload.taxa_entrega,payload.pedido_minimo,payload.tempo_min,payload.tempo_max].every(Number.isFinite) || payload.taxa_entrega < 0 || payload.pedido_minimo < 0 || payload.tempo_min < 5 || payload.tempo_max < payload.tempo_min) return error(ctx.request, 400, "regiao_invalida", "Valores da região inválidos.");
    const { data, error: e } = await unit(ctx.db.from("empresa_regioes").insert(payload).select("*").single());
    return e ? error(ctx.request, 400, "regiao_recusada", e.message) : response(ctx.request, { data });
  }
  if (acao === "regiao_toggle") {
    const id = str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da região inválido.");
    const { data, error: e } = await unit(ctx.db.from("empresa_regioes").update({ ativo: body.ativo === true, updated_at: new Date().toISOString() }).eq("id",id).select("*").single());
    return e ? error(ctx.request,400,"regiao_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "regiao_remover") {
    const id = str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da região inválido.");
    const { error: e } = await unit(ctx.db.from("empresa_regioes").delete().eq("id",id));
    return e ? error(ctx.request,400,"regiao_recusada",e.message) : response(ctx.request,{data:true});
  }
  if (acao === "fidelidade") {
    const { data, error: e } = await ctx.db.from("programa_fidelidade_empresa").upsert({
      empresa_id: empresaId, ativo: body.ativo === true, pontos_por_real: Number(body.pontos_por_real), pontos_para_beneficio: Number(body.pontos_para_beneficio), valor_beneficio: Number(body.valor_beneficio), updated_at: new Date().toISOString()
    }, { onConflict: "empresa_id" }).select("*").single();
    return e ? error(ctx.request,400,"fidelidade_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "cancelamento") {
    const id = str(body.pedido_id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","pedido_id inválido.");
    return rpc(ctx.db,ctx.request,"empresa_decidir_cancelamento",{p_pedido_id:id,p_aprovar:body.aprovar===true,p_observacao:str(body.observacao,2000)});
  }
  if (acao === "financeiro") {
    return rpc(ctx.db,ctx.request,"empresa_relatorio_financeiro",{p_dias:Math.min(Number(body.dias||30),3650)});
  }
  return error(ctx.request,404,"operacao_nao_encontrada","Operação da empresa não encontrada.");
}
async function companyPanel(ctx: RouteContext) {
  const empresaId = str(ctx.url.searchParams.get("empresa_id"), 100);
  const unidadeId = str(ctx.url.searchParams.get("unidade_id"), 100);
  if (!empresaId) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório.");
  if (unidadeId && !uuid(unidadeId)) return error(ctx.request, 400, "parametro_invalido", "unidade_id inválido.");
  const pedidosQuery = ctx.db.from("pedidos").select("*, pedido_itens(*)").eq("empresa_id", empresaId).order("created_at", { ascending: false });
  const produtosQuery = ctx.db.from("produtos").select("*").eq("empresa_id", empresaId).order("nome");
  const categoriasQuery = ctx.db.from("categorias").select("*").eq("empresa_id", empresaId).order("ordem").order("nome");
  if (unidadeId) {
    pedidosQuery.eq("unidade_id", unidadeId);
    produtosQuery.eq("unidade_id", unidadeId);
    categoriasQuery.eq("unidade_id", unidadeId);
  }
  const [empresaQ, pedidosQ, produtosQ, categoriasQ, gruposQ, cuponsQ, avaliacoesQ, movimentosQ] = await Promise.all([
    ctx.db.from("empresas").select("*").eq("id", empresaId).maybeSingle(),
    pedidosQuery,
    produtosQuery,
    categoriasQuery,
    ctx.db.from("grupos_adicionais").select("*").eq("empresa_id", empresaId).order("nome"),
    ctx.db.from("cupons").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ctx.db.from("avaliacoes").select("id,pedido_id,nota,comentario,resposta,autor_nome,autor_avatar_url,created_at,updated_at").eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(200),
    ctx.db.from("estoque_movimentos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(50)
  ]);
  const baseErro = empresaQ.error || pedidosQ.error || produtosQ.error || categoriasQ.error || gruposQ.error || cuponsQ.error || avaliacoesQ.error || movimentosQ.error;
  if (baseErro || !empresaQ.data) return error(ctx.request, 502, "painel_indisponivel", "Não foi possível carregar o painel da empresa.");
  const produtoIds = (produtosQ.data || []).map((item:any) => String(item.id));
  const grupoIds = (gruposQ.data || []).map((item:any) => String(item.id));
  const [adicionaisQ, vinculosQ, variantesQ] = await Promise.all([
    grupoIds.length ? ctx.db.from("adicionais").select("*").in("grupo_id", grupoIds).order("nome") : Promise.resolve({ data: [], error: null }),
    produtoIds.length ? ctx.db.from("produto_grupos").select("*").in("produto_id", produtoIds) : Promise.resolve({ data: [], error: null }),
    produtoIds.length ? ctx.db.from("produto_variantes").select("*").in("produto_id", produtoIds).order("ordem").order("nome") : Promise.resolve({ data: [], error: null })
  ]);
  if (adicionaisQ.error || vinculosQ.error || variantesQ.error) return error(ctx.request, 502, "painel_indisponivel", "Não foi possível carregar o catálogo do painel.");
  return response(ctx.request,{data:{
    empresa: empresaQ.data,
    pedidos: pedidosQ.data || [], produtos: produtosQ.data || [], categorias: categoriasQ.data || [],
    grupos_adicionais: gruposQ.data || [], cupons: cuponsQ.data || [], avaliacoes: avaliacoesQ.data || [],
    adicionais: adicionaisQ.data || [], vinculos_produto_grupo: vinculosQ.data || [], variantes_produto: variantesQ.data || [],
    estoque_movimentos: movimentosQ.data || []
  }});
}
async function companyPanelAction(ctx: RouteContext, body: Json) {
  const acao = str(body.acao, 60), empresaId = str(body.empresa_id,100);
  if (!acao || !empresaId) return error(ctx.request,400,"parametro_invalido","acao e empresa_id são obrigatórios.");
  if (acao === "pedido_pagamento_offline") {
    const id=str(body.pedido_id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","pedido_id inválido.");
    return rpc(ctx.db,ctx.request,"empresa_marcar_pagamento_offline",{p_pedido_id:id});
  }
  if (acao === "pedido_cancelar_nao_pago") {
    const id=str(body.pedido_id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","pedido_id inválido.");
    return rpc(ctx.db,ctx.request,"empresa_cancelar_pedido_nao_pago",{p_pedido_id:id,p_motivo:str(body.motivo,500)});
  }
  if (acao === "pedido_operacao") {
    const id=str(body.pedido_id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","pedido_id inválido.");
    return rpc(ctx.db,ctx.request,"empresa_atualizar_operacao_pedido",{p_pedido_id:id,p_acao:str(body.operacao,100),p_preparo_estimado:int(body.preparo_estimado,1,1440),p_observacao:str(body.observacao,2000)});
  }
  if (acao === "mensagem_enviar") {
    const id=str(body.pedido_id,100), mensagem=str(body.mensagem,2000);
    if(!uuid(id)||!mensagem) return error(ctx.request,400,"parametro_invalido","pedido_id e mensagem são obrigatórios.");
    const {data,error:e}=await ctx.db.from("pedido_mensagens").insert({pedido_id:id,autor_id:ctx.userId,autor_tipo:"restaurante",mensagem:mensagem.slice(0,1000)}).select().single();
    return e ? error(ctx.request,400,"mensagem_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "cupom_criar") {
    const payload={empresa_id:empresaId,codigo:str(body.codigo,100),tipo:str(body.tipo,30),valor:Number(body.valor||0),pedido_minimo:Number(body.pedido_minimo||0),max_desconto:body.max_desconto==null?null:Number(body.max_desconto),limite_usos:body.limite_usos==null?null:Number(body.limite_usos),limite_por_usuario:Number(body.limite_por_usuario||1),primeiro_pedido:body.primeiro_pedido===true,fim:body.fim?new Date(String(body.fim)).toISOString():null,ativo:true};
    if(!payload.codigo || !payload.tipo || !Number.isFinite(payload.valor)||payload.valor<0||!Number.isFinite(payload.pedido_minimo)||payload.pedido_minimo<0) return error(ctx.request,400,"cupom_invalido","Dados do cupom inválidos.");
    const {data,error:e}=await ctx.db.from("cupons").insert(payload).select("*").single();
    return e ? error(ctx.request,e.code==="23505"?409:400,e.code==="23505"?"cupom_duplicado":"cupom_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "cupom_toggle") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do cupom inválido.");
    const {data,error:e}=await ctx.db.from("cupons").update({ativo:body.ativo===true,updated_at:new Date().toISOString()}).eq("id",id).eq("empresa_id",empresaId).select("*").single();
    return e ? error(ctx.request,400,"cupom_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "cupom_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do cupom inválido.");
    const {error:e}=await ctx.db.from("cupons").delete().eq("id",id).eq("empresa_id",empresaId);
    return e ? error(ctx.request,400,"cupom_recusado",e.message) : response(ctx.request,{data:true});
  }
  if (acao === "avaliacao_responder") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da avaliação inválido.");
    return rpc(ctx.db,ctx.request,"empresa_responder_avaliacao",{p_avaliacao_id:id,p_resposta:str(body.resposta,1000)||null});
  }
  if (acao === "categoria_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da categoria inválido.");
    const upd=await ctx.db.from("produtos").update({categoria_id:null}).eq("empresa_id",empresaId).eq("categoria_id",id);
    if(upd.error) return error(ctx.request,400,"categoria_recusada",upd.error.message);
    const del=await ctx.db.from("categorias").delete().eq("id",id).eq("empresa_id",empresaId);
    return del.error ? error(ctx.request,400,"categoria_recusada",del.error.message) : response(ctx.request,{data:true});
  }
  if (acao === "produto_disponibilidade") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do produto inválido.");
    const {data,error:e}=await ctx.db.from("produtos").update({disponivel:body.disponivel===true}).eq("id",id).eq("empresa_id",empresaId).select("*").single();
    return e ? error(ctx.request,400,"produto_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "produto_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do produto inválido.");
    const a=await ctx.db.from("produto_grupos").delete().eq("produto_id",id); if(a.error) return error(ctx.request,400,"produto_recusado",a.error.message);
    const b=await ctx.db.from("produto_variantes").delete().eq("produto_id",id); if(b.error) return error(ctx.request,400,"produto_recusado",b.error.message);
    const d=await ctx.db.from("produtos").delete().eq("id",id).eq("empresa_id",empresaId);
    return d.error ? error(ctx.request,400,"produto_recusado",d.error.message) : response(ctx.request,{data:true});
  }
  if (acao === "variante_criar") {
    const produtoId=str(body.produto_id,100), nome=str(body.nome,120);
    const preco=Number(body.preco), promocao=body.promocao==null||body.promocao===""?null:Number(body.promocao);
    if(!uuid(produtoId)||!nome||!Number.isFinite(preco)||preco<0||(promocao!==null&&(!Number.isFinite(promocao)||promocao<=0||promocao>=preco))) return error(ctx.request,400,"variante_invalida","Dados da variação inválidos.");
    const produto=await ctx.db.from("produtos").select("id,empresa_id").eq("id",produtoId).eq("empresa_id",empresaId).maybeSingle(); if(produto.error||!produto.data) return error(ctx.request,404,"produto_nao_encontrado","Produto não encontrado.");
    const ordemQ=await ctx.db.from("produto_variantes").select("id").eq("produto_id",produtoId);
    const {data,error:e}=await ctx.db.from("produto_variantes").insert({produto_id:produtoId,nome,preco,promocao,ordem:(ordemQ.data||[]).length,ativo:body.ativo!==false}).select("*").single();
    return e ? error(ctx.request,400,"variante_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "variante_toggle") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da variação inválido.");
    const {data,error:e}=await ctx.db.from("produto_variantes").update({ativo:body.ativo===true}).eq("id",id).select("*").single();
    return e ? error(ctx.request,400,"variante_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "variante_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id da variação inválido.");
    const {error:e}=await ctx.db.from("produto_variantes").delete().eq("id",id); return e ? error(ctx.request,400,"variante_recusada",e.message) : response(ctx.request,{data:true});
  }
  if (acao === "grupo_criar") {
    const nome=str(body.nome,120), minimo=Number(body.minimo), maximo=Number(body.maximo);
    if(!nome||!Number.isInteger(minimo)||!Number.isInteger(maximo)||minimo<0||maximo<Math.max(minimo,1)||maximo>20) return error(ctx.request,400,"grupo_invalido","Limites do grupo inválidos.");
    const {data,error:e}=await ctx.db.from("grupos_adicionais").insert({empresa_id:empresaId,nome,minimo,maximo,ativo:true}).select("*").single(); return e ? error(ctx.request,400,"grupo_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "adicional_criar") {
    const grupoId=str(body.grupo_id,100), nome=str(body.nome,120), preco=Number(body.preco);
    if(!uuid(grupoId)||!nome||!Number.isFinite(preco)||preco<0) return error(ctx.request,400,"adicional_invalido","Dados do adicional inválidos.");
    const grupo=await ctx.db.from("grupos_adicionais").select("id").eq("id",grupoId).eq("empresa_id",empresaId).maybeSingle(); if(grupo.error||!grupo.data) return error(ctx.request,404,"grupo_nao_encontrado","Grupo não encontrado.");
    const {data,error:e}=await ctx.db.from("adicionais").insert({grupo_id:grupoId,nome,preco,ativo:true}).select("*").single(); return e ? error(ctx.request,400,"adicional_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "adicional_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do adicional inválido.");
    const {error:e}=await ctx.db.from("adicionais").delete().eq("id",id); return e ? error(ctx.request,400,"adicional_recusado",e.message) : response(ctx.request,{data:true});
  }
  if (acao === "produto_grupo_criar") {
    const produtoId=str(body.produto_id,100), grupoId=str(body.grupo_id,100); if(!uuid(produtoId)||!uuid(grupoId)) return error(ctx.request,400,"parametro_invalido","produto_id e grupo_id são obrigatórios.");
    const [p,g]=await Promise.all([ctx.db.from("produtos").select("id").eq("id",produtoId).eq("empresa_id",empresaId).maybeSingle(),ctx.db.from("grupos_adicionais").select("id").eq("id",grupoId).eq("empresa_id",empresaId).maybeSingle()]);
    if(p.error||g.error||!p.data||!g.data) return error(ctx.request,404,"vinculo_invalido","Produto ou grupo não encontrado.");
    const {data,error:e}=await ctx.db.from("produto_grupos").insert({produto_id:produtoId,grupo_id:grupoId}).select("*").single(); return e ? error(ctx.request,400,"vinculo_recusado",e.message) : response(ctx.request,{data});
  }
  if (acao === "produto_grupo_remover") {
    const produtoId=str(body.produto_id,100), grupoId=str(body.grupo_id,100); if(!uuid(produtoId)||!uuid(grupoId)) return error(ctx.request,400,"parametro_invalido","produto_id e grupo_id são obrigatórios.");
    const {error:e}=await ctx.db.from("produto_grupos").delete().eq("produto_id",produtoId).eq("grupo_id",grupoId); return e ? error(ctx.request,400,"vinculo_recusado",e.message) : response(ctx.request,{data:true});
  }
  if (acao === "grupo_remover") {
    const id=str(body.id,100); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","id do grupo inválido.");
    const links=await ctx.db.from("produto_grupos").delete().eq("grupo_id",id); if(links.error) return error(ctx.request,400,"grupo_recusado",links.error.message);
    const adds=await ctx.db.from("adicionais").delete().eq("grupo_id",id); if(adds.error) return error(ctx.request,400,"grupo_recusado",adds.error.message);
    const del=await ctx.db.from("grupos_adicionais").delete().eq("id",id).eq("empresa_id",empresaId); return del.error ? error(ctx.request,400,"grupo_recusado",del.error.message) : response(ctx.request,{data:true});
  }
  if (acao === "empresa_status") {
    const {data,error:e}=await ctx.db.from("empresas").update({status:body.status===true}).eq("id",empresaId).select("*").single(); return e ? error(ctx.request,400,"empresa_recusada",e.message) : response(ctx.request,{data});
  }
  if (acao === "empresa_atualizar") {
    const allowedKeys=["nome","telefone","categoria","descricao","taxa_entrega","pedido_minimo","cidade_atendimento","uf_atendimento","bairros_atendidos","tempo_estimado_min","tempo_estimado_max","logo","banner"];
    const payload:any={}; for(const k of allowedKeys){ if(body[k]!==undefined) payload[k]=body[k]; }
    const {data,error:e}=await ctx.db.from("empresas").update(payload).eq("id",empresaId).select("*").single(); return e ? error(ctx.request,400,"empresa_recusada",e.message) : response(ctx.request,{data});
  }
  return error(ctx.request,404,"acao_nao_encontrada","Ação do painel não encontrada.");
}
async function adminOperation(ctx: RouteContext) {
  const [chamados,reembolsos,cancelamentos,conciliacao] = await Promise.all([
    ctx.db.from("chamados_suporte").select("id,assunto,mensagem,status,prioridade,created_at").in("status",["aberto","em_analise"]).order("prioridade",{ascending:false}).order("created_at").limit(50),
    ctx.db.from("pedidos").select("id,numero,empresa_nome,cliente_nome,total,reembolso_status,pagamento_reconciliacao_status").in("reembolso_status",["aguardando_pagamento","pendente","processando","falhou"]).order("updated_at").limit(50),
    ctx.db.from("pedidos").select("id,numero,empresa_nome,cliente_nome,cancelamento_motivo").eq("cancelamento_status","solicitado").order("cancelamento_solicitado_em").limit(50),
    ctx.db.rpc("admin_conciliacao_pagamentos",{p_limite:50})
  ]);
  const e=chamados.error||reembolsos.error||cancelamentos.error||conciliacao.error;
  if(e) return error(ctx.request,502,"operacao_admin_indisponivel","Não foi possível carregar a operação administrativa.");
  return response(ctx.request,{data:{chamados:chamados.data||[],reembolsos:reembolsos.data||[],cancelamentos:cancelamentos.data||[],conciliacao:conciliacao.data?.pedidos||[]}});
}
async function driverOrders(ctx: RouteContext) { const { data, error: e } = await ctx.db.from("pedidos").select("*,pedido_itens(*)").eq("entregador_id",ctx.userId).order("created_at",{ascending:false}).limit(100); if(e) return error(ctx.request,502,"entregas_indisponiveis","Não foi possível carregar suas entregas."); return response(ctx.request,{data:data||[]}); }
async function orderReview(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request,400,"id_invalido","Identificador do pedido inválido."); const { data, error: e } = await ctx.db.from("avaliacoes").select("id,pedido_id,nota,comentario,resposta,created_at,updated_at").eq("pedido_id",id).eq("usuario_id",ctx.userId).maybeSingle(); if(e) return error(ctx.request,502,"avaliacao_indisponivel","Não foi possível consultar a avaliação."); return response(ctx.request,{data:data||null}); }
async function orderLocation(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request,400,"id_invalido","Identificador do pedido inválido."); const { data, error: e } = await ctx.db.from("entrega_localizacoes").select("*").eq("pedido_id",id).maybeSingle(); if(e) return error(ctx.request,502,"localizacao_indisponivel","Não foi possível consultar a localização."); return response(ctx.request,{data:data||null},200,"private, max-age=5, stale-while-revalidate=10"); }
async function driverMe(ctx: RouteContext) { const [driver, links] = await Promise.all([ctx.db.from("entregadores").select("id,nome,telefone,veiculo,placa,aprovado,online,latitude,longitude,localizacao_atualizada_em,valor_por_entrega").eq("id",ctx.userId).maybeSingle(), ctx.db.from("empresa_entregadores").select("empresa_id,unidade_id,ativo,created_at,updated_at").eq("entregador_id",ctx.userId).eq("ativo",true)]); if (driver.error || links.error) return error(ctx.request,502,"entregador_indisponivel","Não foi possível carregar o cadastro do entregador."); return response(ctx.request,{data:{entregador:driver.data,vinculos:links.data||[]}}); }
async function companyDrivers(ctx: RouteContext) { const unidadeId = str(ctx.url.searchParams.get("unidade_id"),100); if (!uuid(String(unidadeId || ""))) return error(ctx.request,400,"parametro_invalido","unidade_id inválido."); const { data, error: e } = await ctx.db.rpc("empresa_listar_entregadores_proprios",{p_unidade_id:unidadeId}); if(e) return error(ctx.request,400,"consulta_recusada",e.message || "Não foi possível consultar a equipe."); const { data: unidade } = await ctx.db.from("empresa_unidades").select("id,nome,empresa_id,ativa").eq("id",unidadeId).maybeSingle(); return response(ctx.request,{data:{unidade:unidade||null,entregadores:data||[]}}); }
async function getMe(ctx: RouteContext) { const [profile, userAuth, admin] = await Promise.all([ctx.db.from("usuarios").select("*").eq("id", ctx.userId).maybeSingle(), ctx.db.auth.getUser(), ctx.db.rpc("usuario_eh_admin")]); if (profile.error) return error(ctx.request, 502, "perfil_indisponivel", "Não foi possível carregar o perfil."); const driver = await ctx.db.from("entregadores").select("id,nome,telefone,veiculo,placa,aprovado,online").eq("id",ctx.userId).maybeSingle(); let entregador = driver.error ? null : { ...(driver.data || {}), vinculos: [] as unknown[] }; if (entregador) { const links = await ctx.db.from("empresa_entregadores").select("empresa_id,unidade_id,ativo").eq("entregador_id",ctx.userId).eq("ativo",true); entregador.vinculos = links.data || []; } return response(ctx.request, { data: { usuario: profile.data, auth: userAuth.data?.user ? { id: userAuth.data.user.id, email: userAuth.data.user.email } : null, eh_admin: admin.error ? false : admin.data === true, entregador } }); }
async function getList(ctx: RouteContext, table: string, select: string, filters: Record<string,string> = {}, limit = 100) { let q = ctx.db.from(table).select(select).limit(limit); for (const [k,v] of Object.entries(filters)) q = q.eq(k,v); const { data, error: e } = await q; if (e) return error(ctx.request, 502, "consulta_falhou", "Não foi possível consultar os dados."); return response(ctx.request, { data: data || [] }); }
async function companyInitialize(ctx: RouteContext, body: Json) {
  const nome = str(body.nome, 160), email = str(body.email, 320), telefone = str(body.telefone, 40), cnpj = str(body.cnpj, 30);
  if (!nome || !email || !cnpj) return error(ctx.request, 400, "empresa_invalida", "Nome, e-mail e CNPJ são obrigatórios.");
  const { data: existente, error: consultaErro } = await ctx.db.from("empresas").select("*").eq("usuario_id", ctx.userId).maybeSingle();
  if (consultaErro) return error(ctx.request, 502, "empresa_indisponivel", "Não foi possível consultar o restaurante.");
  if (existente) return response(ctx.request, { data: existente });
  const { data, error: e } = await ctx.db.from("empresas").insert({ usuario_id: ctx.userId, nome, email, telefone: telefone || null, cnpj, status: false, taxa_entrega: 0, pedido_minimo: 0 }).select("*").single();
  return e ? error(ctx.request, e.code === "23505" ? 409 : 400, "empresa_recusada", e.message) : response(ctx.request, { data }, 201);
}
async function publicRestaurantUnits(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); return rpc(ctx.db, ctx.request, "empresa_unidades_publicas", { p_empresa_id: id }); }
async function adminDashboard(ctx: RouteContext) {
  const check = await ctx.db.rpc("usuario_eh_admin");
  if (check.error || check.data !== true) return error(ctx.request, 403, "acesso_negado", "Acesso administrativo negado.");
  const [empresas, usuarios, pedidos, cupons, logs, auditoria] = await Promise.all([
    ctx.db.from("empresas").select("id,usuario_id,nome,email,telefone,cnpj,descricao,categoria,taxa_entrega,pedido_minimo,tempo_estimado_min,tempo_estimado_max,publicado,status,created_at,excluida_em").is("excluida_em", null).order("created_at",{ascending:false}),
    ctx.db.from("usuarios").select("id,nome,sobrenome,telefone,avatar_url,bloqueado,created_at").order("created_at",{ascending:false}),
    ctx.db.from("pedidos").select("id,numero,usuario_id,empresa_id,empresa_nome,cliente_nome,cliente_telefone,status,total,pagamento_status,pagamento_modalidade,agendado_para,created_at,updated_at").order("created_at",{ascending:false}).limit(5000),
    ctx.db.from("cupons").select("id,empresa_id,codigo,tipo,valor,desconto,pedido_minimo,ativo,usos,limite_usos,primeiro_pedido,inicio,fim,validade,max_desconto,limite_por_usuario,created_at").order("created_at",{ascending:false}),
    ctx.db.from("app_logs").select("nivel,contexto,mensagem,pagina,created_at").order("created_at",{ascending:false}).limit(50),
    ctx.db.from("admin_auditoria").select("acao,alvo_id,detalhes,created_at").order("created_at",{ascending:false}).limit(30)
  ]);
  const first = [empresas,usuarios,pedidos,cupons,logs,auditoria].find((r) => r.error);
  if (first) return error(ctx.request,502,"admin_dados_indisponiveis","Não foi possível carregar os dados administrativos.");
  return response(ctx.request,{data:{empresas:empresas.data||[],usuarios:usuarios.data||[],pedidos:pedidos.data||[],cupons:cupons.data||[],logs:logs.data||[],auditoria:auditoria.data||[]}},200,"no-store");
}
async function adminAction(ctx: RouteContext, body: Json) {
  const check = await ctx.db.rpc("usuario_eh_admin");
  if (check.error || check.data !== true) return error(ctx.request,403,"acesso_negado","Acesso administrativo negado.");
  const action = str(body.acao,80);
  const args: Json = {};
  if (action === "entregador") { args.p_entregador_id=String(body.entregador_id||""); args.p_aprovado=body.aprovado===true; return rpc(ctx.db,ctx.request,"admin_definir_entregador",args); }
  if (action === "usuario_bloqueio") { args.p_usuario_id=String(body.usuario_id||""); args.p_bloqueado=body.bloqueado===true; return rpc(ctx.db,ctx.request,"admin_definir_usuario_bloqueio",args); }
  if (action === "cupom_status") { args.p_cupom_id=String(body.cupom_id||""); args.p_ativo=body.ativo===true; return rpc(ctx.db,ctx.request,"admin_definir_cupom",args); }
  if (action === "cupom_salvar") return rpc(ctx.db,ctx.request,"admin_salvar_cupom",{p_codigo:str(body.codigo,100),p_tipo:str(body.tipo,40),p_valor:Number(body.valor||0),p_empresa_id:body.empresa_id||null,p_pedido_minimo:Number(body.pedido_minimo||0),p_limite_usos:body.limite_usos??null,p_primeiro_pedido:body.primeiro_pedido===true,p_inicio:body.inicio||new Date().toISOString(),p_fim:body.fim||null,p_max_desconto:body.max_desconto??null,p_limite_por_usuario:Number(body.limite_por_usuario||1),p_cupom_id:body.cupom_id||null,p_ativo:body.ativo!==false});
  if (action === "cupom_excluir") return rpc(ctx.db,ctx.request,"admin_excluir_cupom",{p_cupom_id:String(body.cupom_id||"")});
  if (action === "restaurante_status") return rpc(ctx.db,ctx.request,"admin_definir_restaurante",{p_empresa_id:String(body.empresa_id||""),p_publicado:body.publicado===true,p_status:body.status===true});
  if (action === "restaurante_atualizar") return rpc(ctx.db,ctx.request,"admin_atualizar_restaurante",{p_empresa_id:String(body.p_empresa_id||body.empresa_id||""),p_nome:str(body.p_nome||body.nome,160),p_email:str(body.p_email||body.email,320),p_telefone:str(body.p_telefone||body.telefone,40),p_categoria:str(body.p_categoria||body.categoria,100),p_descricao:str(body.p_descricao||body.descricao,3000),p_taxa_entrega:Number(body.p_taxa_entrega??body.taxa_entrega??0),p_pedido_minimo:Number(body.p_pedido_minimo??body.pedido_minimo??0),p_tempo_min:Number(body.p_tempo_min??body.tempo_min??25),p_tempo_max:Number(body.p_tempo_max??body.tempo_max??45),p_publicado:body.p_publicado===true||body.publicado===true,p_status:body.p_status===true||body.status===true});
  if (action === "restaurante_excluir") return rpc(ctx.db,ctx.request,"admin_excluir_restaurante",{p_empresa_id:String(body.p_empresa_id||body.empresa_id||""),p_nome_confirmacao:str(body.p_nome_confirmacao||body.confirmacao,200)});
  if (action === "pedido_detalhe") return rpc(ctx.db,ctx.request,"admin_obter_pedido",{p_pedido_id:String(body.pedido_id||"")});
  if (action === "relatorios") return response(ctx.request,{data:{
    operacional:(await ctx.db.rpc("admin_relatorio_operacional",{p_dias:Math.min(Number(body.dias||30),3650)})).data||null,
    inteligencia:(await ctx.db.rpc("admin_relatorio_clientes_produtos",{p_dias:Math.min(Number(body.dias||30),3650)})).data||null
  }});
  return error(ctx.request,400,"acao_invalida","Ação administrativa inválida.");
}
async function handleGet(ctx: RouteContext) { const p = ctx.path; if (p === "/v1/admin/dashboard") return adminDashboard(ctx); if (p === "/" || p === "/v1" || p === "/v1/status") return response(ctx.request, { data: { status: "ok", servico: "multi-delivery-api", versao: API_VERSION } }, 200, "public, max-age=30"); if (p === "/v1/restaurantes") return publicRestaurants(ctx); const m = p.match(/^\/v1\/restaurantes\/([^/]+)\/cardapio$/); if (m) return menu(ctx, m[1]); const ud = p.match(/^\/v1\/restaurantes\/([^/]+)\/unidades\/([^/]+)\/disponibilidade$/); if (ud) return unitAvailability(ctx, ud[1], ud[2]); const u = p.match(/^\/v1\/restaurantes\/([^/]+)\/unidades$/); if (u) return publicRestaurantUnits(ctx, u[1]); const a = p.match(/^\/v1\/restaurantes\/([^/]+)\/disponibilidade$/); if (a) return availability(ctx, a[1]); const s = p.match(/^\/v1\/restaurantes\/([^/]+)\/avaliacoes-resumo$/); if (s) return reviewsSummary(ctx, s[1]); const r = p.match(/^\/v1\/restaurantes\/([^/]+)\/avaliacoes$/); if (r) return reviews(ctx, r[1]); if (p === "/v1/avaliacoes-resumo") return reviewsSummaryAll(ctx); if (p === "/v1/produtos/destaques") return publicHighlights(ctx); if (p === "/v1/me") return getMe(ctx); if (p === "/v1/entregador/me") return driverMe(ctx); if (p === "/v1/entregador/pedidos") return driverOrders(ctx); if (p === "/v1/me/enderecos") return getList(ctx, "enderecos", "*"); if (p === "/v1/me/pedidos") return getList(ctx, "pedidos", "*,pedido_itens(*)"); if (p === "/v1/me/favoritos") return getList(ctx, "favoritos", "*"); if (p === "/v1/me/avaliacoes") return getList(ctx, "avaliacoes", "*"); if (p === "/v1/me/notificacoes") return getList(ctx, "notificacoes", "*"); if (p === "/v1/me/fidelidade") return loyalty(ctx); if (p === "/v1/admin/saude") return rpc(ctx.db, ctx.request, "admin_saude_operacao"); if (p === "/v1/admin/planos") return rpc(ctx.db, ctx.request, "admin_planos_listar"); if (p === "/v1/admin/assinaturas") return rpc(ctx.db, ctx.request, "admin_assinaturas_listar"); if (p === "/v1/admin/relatorios/clientes-produtos") return rpc(ctx.db, ctx.request, "admin_relatorio_clientes_produtos", { p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) }); if (p === "/v1/admin/relatorios/operacional") return rpc(ctx.db, ctx.request, "admin_relatorio_operacional", { p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) }); if (p === "/v1/admin/operacao") { const op = await adminOperation(ctx); return op; } if (p === "/v1/empresa/unidades") return companyUnits(ctx); if (p === "/v1/empresa/operacao") return companyOperation(ctx); if (p === "/v1/empresa/painel") return companyPanel(ctx); if (p === "/v1/empresa/acesso") return rpc(ctx.db, ctx.request, "empresa_meu_acesso"); if (p === "/v1/empresa/plano") return rpc(ctx.db, ctx.request, "empresa_meu_plano"); if (p === "/v1/empresa/pedidos") return rpc(ctx.db, ctx.request, "empresa_operador_pedidos", { p_empresa_id: ctx.url.searchParams.get("empresa_id"), p_limite: Math.min(Number(ctx.url.searchParams.get("limite") || 100), 200) }); if (p === "/v1/empresa/funcionarios") return rpc(ctx.db, ctx.request, "empresa_listar_funcionarios", { p_empresa_id: ctx.url.searchParams.get("empresa_id") }); if (p === "/v1/admin/empresas") return getList(ctx, "empresas", "id,nome", {}, 500); if (p === "/v1/empresa/entregadores") return companyDrivers(ctx); if (p === "/v1/empresa/importacao/catalogo") { const unidadeId = ctx.url.searchParams.get("unidade_id"); if (!uuid(String(unidadeId||""))) return error(ctx.request,400,"parametro_invalido","unidade_id inválido."); const [produtos,categorias] = await Promise.all([ctx.db.from("produtos").select("nome,categoria_id").eq("unidade_id",unidadeId),ctx.db.from("categorias").select("id,nome").eq("unidade_id",unidadeId)]); if (produtos.error || categorias.error) return error(ctx.request,502,"catalogo_indisponivel","Não foi possível consultar o catálogo."); return response(ctx.request,{data:{produtos:produtos.data||[],categorias:categorias.data||[]}}); } if (p === "/v1/empresa/pedido-eventos") { const empresaId = ctx.url.searchParams.get("empresa_id"); if (!empresaId) return error(ctx.request,400,"parametro_invalido","empresa_id é obrigatório."); return getList(ctx,"pedido_operacao_eventos","id,pedido_id,acao,status_anterior,status_novo,preparo_estimado_minutos,observacao,created_at",{empresa_id:empresaId},100); } if (p === "/v1/empresa/relatorios/financeiro") return rpc(ctx.db, ctx.request, "empresa_relatorio_financeiro", { p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) }); if (p === "/v1/empresa/relatorios/financeiro-acesso") return rpc(ctx.db, ctx.request, "empresa_relatorio_financeiro_acesso", { p_empresa_id: ctx.url.searchParams.get("empresa_id"), p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) }); if (p === "/v1/empresa/relatorios/operacional") return rpc(ctx.db, ctx.request, "empresa_relatorio_operacional", { p_dias: Math.min(Number(ctx.url.searchParams.get("dias") || 30), 3650) }); if (p === "/v1/entregador/entregas") return rpc(ctx.db, ctx.request, "listar_entregas_disponiveis"); if (p === "/v1/entregador/ganhos") return rpc(ctx.db, ctx.request, "entregador_meu_historico_ganhos", { p_limite: Math.min(Number(ctx.url.searchParams.get("limite") || 50), 200), p_offset: Math.max(Number(ctx.url.searchParams.get("offset") || 0), 0) }); if (p === "/v1/entregador/resumo") return rpc(ctx.db, ctx.request, "entregador_meu_resumo_ganhos"); const order = p.match(/^\/v1\/pedidos\/([^/]+)$/); if (order && uuid(order[1])) return getList(ctx, "pedidos", "*,pedido_itens(*)", { id: order[1] }, 1); const messages = p.match(/^\/v1\/pedidos\/([^/]+)\/mensagens$/); if (messages && uuid(messages[1])) return getList(ctx, "pedido_mensagens", "*", { pedido_id: messages[1] }); const history = p.match(/^\/v1\/pedidos\/([^/]+)\/historico$/); if (history && uuid(history[1])) return getList(ctx, "historico_status_pedido", "*", { pedido_id: history[1] }); const location = p.match(/^\/v1\/pedidos\/([^/]+)\/localizacao$/); if (location && uuid(location[1])) return orderLocation(ctx, location[1]); const reviewRead = p.match(/^\/v1\/pedidos\/([^/]+)\/avaliacao$/); if (reviewRead && uuid(reviewRead[1])) return orderReview(ctx, reviewRead[1]); if (p === "/v1/me/suporte") return getList(ctx, "chamados_suporte", "*", { usuario_id: ctx.userId }, 100); return error(ctx.request, 404, "rota_nao_encontrada", "Rota da API não encontrada."); }
async function handlePost(ctx: RouteContext) { const p = ctx.path, b = await bodyJson(ctx.request); if (!b) return error(ctx.request, 400, "json_invalido", "Corpo JSON inválido."); if (p === "/v1/me/push-subscription") { const endpoint = str(b.endpoint,2000); const subscription = b.subscription && typeof b.subscription === "object" ? b.subscription : null; if (!endpoint || !subscription) return error(ctx.request,400,"push_invalido","Assinatura de notificações inválida."); const saved = await ctx.db.from("push_subscriptions").upsert({ usuario_id: ctx.userId, endpoint, subscription }, { onConflict: "usuario_id,endpoint" }).select("id").maybeSingle(); return saved.error ? error(ctx.request,400,"push_recusado",saved.error.message) : response(ctx.request,{data:saved.data||true}); } if (p === "/v1/admin/acao") return adminAction(ctx,b); if (p === "/v1/monitoramento/logs") { const nivel = str(b.nivel,20) || "error", contexto = str(b.contexto,120) || "frontend", mensagem = str(b.mensagem,500) || "Falha frontend", pagina = str(b.pagina,200) || null; const detalhes = b.detalhes && typeof b.detalhes === "object" ? b.detalhes : {}; const saved = await ctx.db.from("app_logs").insert({ usuario_id: ctx.userId, nivel: ["info","warning","error"].includes(nivel) ? nivel : "error", contexto, mensagem, pagina, detalhes }).select("id").single(); return saved.error ? error(ctx.request,400,"log_recusado",saved.error.message) : response(ctx.request,{data:saved.data}); } if (p === "/v1/me/notificacoes/lidas") { const ids = Array.isArray(b.ids) ? b.ids.filter((id) => uuid(String(id))).map(String).slice(0,100) : []; if (!ids.length) return response(ctx.request,{data:true}); const saved = await ctx.db.from("notificacoes").update({ lida: true }).in("id",ids).eq("usuario_id",ctx.userId); return saved.error ? error(ctx.request,400,"notificacoes_recusadas",saved.error.message) : response(ctx.request,{data:true}); } if (p === "/v1/empresa/inicializar") return companyInitialize(ctx, b); if (p === "/v1/me/enderecos" || p === "/v1/enderecos") return rpc(ctx.db, ctx.request, "endereco_salvar", { p_endereco: b }); if (p === "/v1/empresa/unidades") return companyUnitSave(ctx,b); if (p === "/v1/empresa/operacao") return companyOperationAction(ctx,b); if (p === "/v1/empresa/painel") return companyPanelAction(ctx,b); if (p === "/v1/empresa/funcionarios") { const empresaId = str(b.empresa_id,100), email = str(b.email,320), papel = str(b.papel,40); if (!empresaId || !email || !papel) return error(ctx.request,400,"parametro_invalido","empresa_id, email e papel são obrigatórios."); return rpc(ctx.db,ctx.request,"empresa_salvar_funcionario",{p_empresa_id:empresaId,p_email:email,p_papel:papel}); } if (p === "/v1/admin/planos") { return rpc(ctx.db,ctx.request,"admin_plano_salvar",{p_plano:b.plano || b}); } if (p === "/v1/admin/chamados/responder") { const id=str(b.chamado_id,100), resposta=str(b.resposta,5000); if(!id||!resposta) return error(ctx.request,400,"parametro_invalido","chamado_id e resposta são obrigatórios."); return rpc(ctx.db,ctx.request,"admin_responder_chamado",{p_chamado_id:id,p_resposta:resposta,p_fechar:b.fechar===true}); } if (p === "/v1/admin/pedidos/cancelamento") { const id=str(b.pedido_id,100); if(!id) return error(ctx.request,400,"parametro_invalido","pedido_id é obrigatório."); return rpc(ctx.db,ctx.request,"empresa_decidir_cancelamento",{p_pedido_id:id,p_aprovar:b.aprovar===true,p_observacao:str(b.observacao,2000)}); } if (p === "/v1/admin/reembolso/processar") { const token=ctx.request.headers.get("authorization")||""; const url=(Deno.env.get("SUPABASE_URL")||"")+"/functions/v1/processar-reembolso"; const rr=await fetch(url,{method:"POST",headers:{"Authorization":token,"apikey":Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"","Content-Type":"application/json"},body:JSON.stringify({pedido_id:b.pedido_id})}); const data=await rr.json().catch(()=>({error:{message:"Resposta de reembolso inválida."}})); return response(ctx.request,data as Json,rr.status); } if (p === "/v1/admin/assinaturas") { return rpc(ctx.db,ctx.request,"admin_assinatura_definir",{p_empresa_id:String(b.empresa_id||""),p_plano_id:String(b.plano_id||""),p_status:str(b.status,50),p_trial_dias:b.trial_dias ?? null}); } if (p === "/v1/empresa/importacao") return rpc(ctx.db,ctx.request,"importar_produtos_csv",{p_empresa_id:String(b.empresa_id||""),p_unidade_id:String(b.unidade_id||""),p_produtos:Array.isArray(b.produtos)?b.produtos:[]}); if (p === "/v1/empresa/unidade/disponibilidade") return rpc(ctx.db,ctx.request,"empresa_disponibilidade_unidade",{p_empresa_id:String(b.empresa_id||""),p_unidade_id:String(b.unidade_id||""),p_quando:str(b.quando,80)||new Date().toISOString()}); if (p === "/v1/empresa/pedido/cancelar") { const id=str(b.pedido_id,100), motivo=str(b.motivo,1000); if(!uuid(id)) return error(ctx.request,400,"parametro_invalido","pedido_id inválido."); return rpc(ctx.db,ctx.request,"empresa_cancelar_pedido_nao_pago",{p_pedido_id:id,p_motivo:motivo}); } if (p === "/v1/empresa/pedido/cancelamento") return rpc(ctx.db,ctx.request,"empresa_decidir_cancelamento",{p_pedido_id:String(b.pedido_id||""),p_aprovar:b.aprovar===true,p_observacao:str(b.observacao,2000)}); if (p === "/v1/empresa/pagamento-offline") return rpc(ctx.db,ctx.request,"empresa_marcar_pagamento_offline",{p_pedido_id:String(b.pedido_id||"")}); if (p === "/v1/empresa/entregadores") { const unidadeId = str(b.unidade_id,100), email = str(b.email,320); if (!uuid(String(unidadeId||"")) || !email) return error(ctx.request,400,"parametro_invalido","unidade_id e email são obrigatórios."); return rpc(ctx.db,ctx.request,"empresa_salvar_entregador_proprio",{p_unidade_id:unidadeId,p_email:email}); } if (p === "/v1/enderecos/principal") { const id = str(b.endereco_id,100); if (!uuid(String(id||""))) return error(ctx.request,400,"parametro_invalido","endereco_id inválido."); return rpc(ctx.db,ctx.request,"endereco_selecionar",{p_endereco_id:id}); } if (p === "/v1/entregador/cadastro") return rpc(ctx.db,ctx.request,"cadastrar_entregador",{p_nome:str(b.nome,120),p_telefone:str(b.telefone,40),p_veiculo:str(b.veiculo,40)||"Moto",p_documento:str(b.documento,40),p_placa:str(b.placa,10)}); if (p === "/v1/cupons/validar") { const codigo = str(b.codigo,100), empresaId = str(b.empresa_id,100); if (!codigo || !empresaId) return error(ctx.request,400,"parametro_invalido","codigo e empresa_id são obrigatórios."); const cupom = await ctx.db.from("cupons").select("id,empresa_id,codigo,tipo,valor,pedido_minimo,max_desconto,primeiro_pedido,inicio,fim,dias_semana,horario_inicio,horario_fim").ilike("codigo",codigo).limit(20); if (cupom.error) return error(ctx.request,502,"cupom_indisponivel","Não foi possível validar o cupom."); const opcoes=(cupom.data||[]).filter((item:any)=>item.empresa_id===null||String(item.empresa_id)===String(empresaId)); const escolhido=opcoes.find((item:any)=>String(item.empresa_id)===String(empresaId))||opcoes.find((item:any)=>item.empresa_id===null)||null; if (!escolhido) return response(ctx.request,{data:null}); if (escolhido.primeiro_pedido) { const historico=await ctx.db.from("pedidos").select("id").neq("status","cancelado").limit(1); if (historico.error) return error(ctx.request,502,"cupom_indisponivel","Não foi possível validar o uso do cupom."); if ((historico.data||[]).length) return response(ctx.request,{data:null}); } return response(ctx.request,{data:escolhido}); } if (p === "/v1/fidelidade/resgatar") { const empresaId = str(b.empresa_id,100); if (!empresaId) return error(ctx.request,400,"parametro_invalido","empresa_id é obrigatório."); return rpc(ctx.db,ctx.request,"resgatar_beneficio_fidelidade",{p_empresa_id:empresaId}); } if (p === "/v1/pedidos") { const empresa = str(b.empresa_id, 200), endereco = str(b.endereco, 2000), pagamento = str(b.pagamento, 50), itens = b.itens; if (!empresa || !endereco || !pagamento || !Array.isArray(itens) || !itens.length) return error(ctx.request, 400, "pedido_invalido", "Empresa, endereço, pagamento e itens são obrigatórios."); const args: Json = { p_empresa_id: empresa, p_pagamento: pagamento, p_observacoes: str(b.observacoes, 2000), p_cupom: str(b.cupom, 100), p_itens: itens, p_agendado_para: b.agendado_para ?? null }; if (uuid(String(b.endereco_id || ""))) { const chave = uuid(String(b.chave_cliente || "")) ? b.chave_cliente : null; if (uuid(String(b.unidade_id || ""))) return rpc(ctx.db, ctx.request, "criar_pedido_operacional_unidade", { ...args, p_endereco_id: b.endereco_id, p_unidade_id: b.unidade_id, p_chave_cliente: chave }); return rpc(ctx.db, ctx.request, "criar_pedido_operacional", { ...args, p_endereco_id: b.endereco_id, p_chave_cliente: chave }); } return rpc(ctx.db, ctx.request, "criar_pedido", { ...args, p_endereco: endereco }); } if (p === "/v1/entrega/calcular") { const args = { p_empresa_id: str(b.empresa_id,200), p_cidade: str(b.cidade,120), p_uf: str(b.uf,10), p_bairro: str(b.bairro,160) }; if (uuid(String(b.unidade_id || "")) && uuid(String(b.endereco_id || ""))) return rpc(ctx.db,ctx.request,"calcular_entrega_unidade_endereco",{p_empresa_id:args.p_empresa_id,p_unidade_id:b.unidade_id,p_endereco_id:b.endereco_id,p_quando:str(b.quando,80)||new Date().toISOString()}); return uuid(String(b.unidade_id || "")) ? rpc(ctx.db,ctx.request,"calcular_entrega_unidade",{...args,p_unidade_id:b.unidade_id}) : rpc(ctx.db,ctx.request,"calcular_entrega_empresa",args); } if (p === "/v1/suporte") { const resultado = await ctx.db.rpc("abrir_chamado_suporte", { p_categoria: str(b.categoria, 100), p_assunto: str(b.assunto, 200), p_mensagem: str(b.mensagem, 5000), p_pedido_id: uuid(String(b.pedido_id || "")) ? b.pedido_id : null }); if (resultado.error) return error(ctx.request,400,"suporte_recusado",resultado.error.message || "Não foi possível abrir o chamado."); const novo = await ctx.db.from("chamados_suporte").select("*").eq("id",resultado.data).eq("usuario_id",ctx.userId).maybeSingle(); return response(ctx.request,{data:novo.data||{id:resultado.data}}); } if (p === "/v1/favoritos") { const empresa = str(b.empresa_id, 200); if (!empresa) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório."); const { data, error: e } = await ctx.db.from("favoritos").upsert({ usuario_id: ctx.userId, empresa_id: empresa }, { onConflict: "usuario_id,empresa_id" }).select().maybeSingle(); return e ? error(ctx.request, 400, "favorito_recusado", e.message) : response(ctx.request, { data }); } const cancel = p.match(/^\/v1\/pedidos\/([^/]+)\/cancelar$/); if (cancel && uuid(cancel[1])) return rpc(ctx.db, ctx.request, "cliente_solicitar_cancelamento", { p_pedido_id: cancel[1], p_motivo: str(b.motivo, 1000) }); const msg = p.match(/^\/v1\/pedidos\/([^/]+)\/mensagens$/); if (msg && uuid(msg[1])) { const mensagem = str(b.mensagem, 2000); if (!mensagem) return error(ctx.request, 400, "mensagem_invalida", "Mensagem obrigatória."); const { data, error: e } = await ctx.db.from("pedido_mensagens").insert({ pedido_id: msg[1], autor_id: ctx.userId, mensagem, autor_tipo: str(b.autor_tipo, 30) || "cliente" }).select().single(); return e ? error(ctx.request, 400, "mensagem_recusada", e.message) : response(ctx.request, { data }); } const review = p.match(/^\/v1\/pedidos\/([^/]+)\/avaliacao$/); if (review && uuid(review[1])) { const nota = int(b.nota, 1, 5); if (!nota) return error(ctx.request, 400, "nota_invalida", "A nota deve estar entre 1 e 5."); const pedido = await ctx.db.from("pedidos").select("id,empresa_id,status").eq("id",review[1]).eq("usuario_id",ctx.userId).maybeSingle(); if (pedido.error || !pedido.data) return error(ctx.request,404,"pedido_nao_encontrado","Pedido não encontrado."); if (pedido.data.status !== "entregue") return error(ctx.request,400,"avaliacao_bloqueada","A avaliação só pode ser registrada após a entrega."); const existente = await ctx.db.from("avaliacoes").select("id").eq("pedido_id",review[1]).eq("usuario_id",ctx.userId).maybeSingle(); if (existente.error) return error(ctx.request,502,"avaliacao_indisponivel","Não foi possível consultar a avaliação."); const payload={nota,comentario:str(b.comentario,2000)||null,updated_at:new Date().toISOString()}; const saved = existente.data ? await ctx.db.from("avaliacoes").update(payload).eq("id",existente.data.id).select("id,nota,comentario,created_at,updated_at").single() : await ctx.db.from("avaliacoes").insert({pedido_id:review[1],usuario_id:ctx.userId,empresa_id:pedido.data.empresa_id,...payload}).select("id,nota,comentario,created_at,updated_at").single(); return saved.error ? error(ctx.request,400,"avaliacao_recusada",saved.error.message || "Não foi possível salvar a avaliação.") : response(ctx.request,{data:saved.data}); } const op = p.match(/^\/v1\/empresa\/pedidos\/([^/]+)\/operacao$/); if (op && uuid(op[1])) return rpc(ctx.db, ctx.request, "empresa_atualizar_operacao_pedido", { p_pedido_id: op[1], p_acao: str(b.acao, 100), p_preparo_estimado: int(b.preparo_estimado, 1, 1440), p_observacao: str(b.observacao, 2000) }); const offline = p.match(/^\/v1\/empresa\/pedidos\/([^/]+)\/pagamento-offline$/); if (offline && uuid(offline[1])) return rpc(ctx.db, ctx.request, "empresa_marcar_pagamento_offline", { p_pedido_id: offline[1] }); const assign = p.match(/^\/v1\/empresa\/pedidos\/([^/]+)\/entregador$/); if (assign && uuid(assign[1]) && uuid(String(b.entregador_id || ""))) return rpc(ctx.db, ctx.request, "empresa_atribuir_entregador_proprio", { p_pedido_id: assign[1], p_entregador_id: b.entregador_id }); const accept = p.match(/^\/v1\/entregador\/pedidos\/([^/]+)\/aceitar$/); if (accept && uuid(accept[1])) return rpc(ctx.db, ctx.request, "entregador_aceitar_pedido", { p_pedido_id: accept[1] }); if (p === "/v1/admin/reembolso/preparar") return rpc(ctx.db, ctx.request, "admin_preparar_reembolso", { p_pedido_id: String(b.pedido_id) }); if (p === "/v1/admin/reembolso/atualizar") return rpc(ctx.db, ctx.request, "admin_atualizar_reembolso", { p_pedido_id: String(b.pedido_id), p_status: str(b.status, 50) }); if (p === "/v1/admin/conciliacao") return rpc(ctx.db, ctx.request, "admin_conciliacao_pagamentos", { p_limite: Math.min(Number(b.limite || 100), 500) }); if (p === "/v1/admin/usuario/bloqueio") return rpc(ctx.db, ctx.request, "admin_definir_usuario_bloqueio", { p_usuario_id: String(b.usuario_id), p_bloqueado: !!b.bloqueado }); if (p === "/v1/admin/entregador/aprovacao") return rpc(ctx.db, ctx.request, "admin_definir_entregador", { p_entregador_id: String(b.entregador_id), p_aprovado: !!b.aprovado }); if (p === "/v1/entregador/status") return rpc(ctx.db, ctx.request, "entregador_definir_online", { p_online: !!b.online }); if (p === "/v1/pagamentos/criar") { const token = ctx.request.headers.get("authorization") || ""; const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/criar-pagamento`; const r = await fetch(url, { method: "POST", headers: { "Authorization": token, "apikey": Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "", "Content-Type": "application/json" }, body: JSON.stringify(b) }); const data = await r.json().catch(() => ({ error: { code: "resposta_invalida", message: "Resposta de pagamento inválida." } })); return response(ctx.request, data as Json, r.status); } if (p === "/v1/entregador/localizacao") return rpc(ctx.db, ctx.request, "entregador_atualizar_posicao", { p_latitude: Number(b.latitude), p_longitude: Number(b.longitude), p_precisao_metros: Number(b.precisao_metros || 0) }); const loc = p.match(/^\/v1\/entregador\/pedidos\/([^/]+)\/localizacao$/); if (loc && uuid(loc[1])) return rpc(ctx.db, ctx.request, "entregador_atualizar_localizacao", { p_pedido_id: loc[1], p_latitude: Number(b.latitude), p_longitude: Number(b.longitude), p_precisao_metros: Number(b.precisao_metros || 0) }); const st = p.match(/^\/v1\/entregador\/pedidos\/([^/]+)\/status$/); if (st && uuid(st[1])) return rpc(ctx.db, ctx.request, "entregador_atualizar_status", { p_pedido_id: st[1], p_status: str(b.status, 100), p_pagamento_recebido: !!b.pagamento_recebido }); return error(ctx.request, 404, "rota_nao_encontrada", "Rota POST não encontrada."); }
async function handlePatch(ctx: RouteContext) { const b = await bodyJson(ctx.request); if (!b) return error(ctx.request, 400, "json_invalido", "Corpo JSON inválido."); const loc = ctx.path.match(/^\/v1\/enderecos\/([^/]+)\/localizacao$/); if (loc && uuid(loc[1])) return rpc(ctx.db, ctx.request, "endereco_atualizar_localizacao", { p_endereco_id: loc[1], p_latitude: Number(b.latitude), p_longitude: Number(b.longitude) }); if (ctx.path === "/v1/me") { const allowed: Json = { nome: str(b.nome, 120), sobrenome: str(b.sobrenome, 120), telefone: str(b.telefone, 40), cpf: str(b.cpf, 30), avatar_url: str(b.avatar_url, 1000) }; const clean = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== null)); const { data, error: e } = await ctx.db.from("usuarios").update(clean).eq("id", ctx.userId).select().single(); return e ? error(ctx.request, 400, "perfil_recusado", e.message) : response(ctx.request, { data }); } return error(ctx.request, 404, "rota_nao_encontrada", "Rota PATCH não encontrada."); }
async function handleDelete(ctx: RouteContext) { const m = ctx.path.match(/^\/v1\/enderecos\/([^/]+)$/); if (m && uuid(m[1])) return rpc(ctx.db, ctx.request, "endereco_remover", { p_endereco_id: m[1] }); const ef = ctx.path.match(/^\/v1\/empresa\/funcionarios\/([^/]+)$/); if (ef) { const empresaId = str(ctx.url.searchParams.get("empresa_id"),100); if (!empresaId || !uuid(ef[1])) return error(ctx.request,400,"parametro_invalido","empresa_id e usuario_id são obrigatórios."); return rpc(ctx.db,ctx.request,"empresa_remover_funcionario",{p_empresa_id:empresaId,p_usuario_id:ef[1]}); } const f = ctx.path.match(/^\/v1\/favoritos\/([^/]+)$/); if (f) { const { error: e } = await ctx.db.from("favoritos").delete().eq("usuario_id", ctx.userId).eq("empresa_id", f[1]); return e ? error(ctx.request, 400, "favorito_recusado", e.message) : response(ctx.request, { data: true }); } return error(ctx.request, 404, "rota_nao_encontrada", "Rota DELETE não encontrada."); }
Deno.serve(async request => { if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) }); const db = client(request); if (!db) return error(request, 503, "configuracao_invalida", "API sem configuração do Supabase."); const path = pathOf(request); if (!(METHODS as readonly string[]).includes(request.method)) return error(request, 405, "metodo_nao_permitido", "Método não permitido."); const publicRoute = isPublic(path); let userId: string | null = null; if (!publicRoute) { const user = await authUser(db); if (!user) return error(request, 401, "nao_autenticado", "Autenticação obrigatória."); userId = user.id; } const ctx: RouteContext = { request, url: new URL(request.url), path, db, userId }; if (request.method === "GET" || request.method === "HEAD") return handleGet(ctx); if (request.method === "POST") return handlePost(ctx); if (request.method === "PATCH") return handlePatch(ctx); return handleDelete(ctx); });
