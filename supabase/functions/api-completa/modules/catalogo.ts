import type { RouteContext } from "../../_shared/api/types.ts";
import { error, response } from "../../_shared/api/http.ts";
import { int, str, uuid } from "../../_shared/api/validation.ts";

const RESTAURANT_FIELDS = "id,nome,descricao,categoria,tipo,logo,banner,taxa_entrega,pedido_minimo,status,cidade_atendimento,uf_atendimento,bairros_atendidos,tempo_estimado_min,tempo_estimado_max";

export async function publicRestaurants(ctx: RouteContext) { 
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
export async function menu(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const { data: restaurant, error: re } = await ctx.db.from("empresas_catalogo").select(RESTAURANT_FIELDS).eq("id", id).maybeSingle(); if (re) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante."); if (!restaurant) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado."); const [cats, products, groups] = await Promise.all([ctx.db.from("categorias").select("id,nome,ordem,unidade_id").eq("empresa_id", id).eq("ativo", true).order("ordem").order("nome"), ctx.db.from("produtos").select("id,categoria_id,nome,descricao,imagem,preco,promocao,unidade_id").eq("empresa_id", id).eq("disponivel", true).order("nome"), ctx.db.from("grupos_adicionais").select("id,nome,minimo,maximo").eq("empresa_id", id).eq("ativo", true).order("nome")]); const first = cats.error || products.error || groups.error; if (first) return error(ctx.request, 502, "falha_cardapio", "Não foi possível carregar o cardápio."); const productIds = (products.data || []).map((p: any) => String(p.id)); const groupIds = (groups.data || []).map((g: any) => String(g.id)); const [variants, links, additions] = await Promise.all([productIds.length ? ctx.db.from("produto_variantes").select("id,produto_id,nome,preco,promocao,ordem").in("produto_id", productIds).eq("ativo", true).order("ordem") : Promise.resolve({ data: [], error: null }), productIds.length ? ctx.db.from("produto_grupos").select("produto_id,grupo_id").in("produto_id", productIds) : Promise.resolve({ data: [], error: null }), groupIds.length ? ctx.db.from("adicionais").select("id,grupo_id,nome,preco").in("grupo_id", groupIds).eq("ativo", true).order("nome") : Promise.resolve({ data: [], error: null })]); const related = variants.error || links.error || additions.error; if (related) return error(ctx.request, 502, "falha_cardapio", "Não foi possível carregar os complementos."); const vp = new Map<string, unknown[]>(), gp = new Map<string, string[]>(), ag = new Map<string, unknown[]>(); for (const x of (variants.data || []) as any[]) vp.set(String(x.produto_id), [...(vp.get(String(x.produto_id)) || []), x]); for (const x of (links.data || []) as any[]) gp.set(String(x.produto_id), [...(gp.get(String(x.produto_id)) || []), String(x.grupo_id)]); for (const x of (additions.data || []) as any[]) ag.set(String(x.grupo_id), [...(ag.get(String(x.grupo_id)) || []), x]); return response(ctx.request, { data: { restaurante: restaurant, categorias: cats.data || [], produtos: (products.data || []).map((p: any) => ({ ...p, variantes: vp.get(String(p.id)) || [], grupos_adicionais: gp.get(String(p.id)) || [] })), grupos_adicionais: (groups.data || []).map((g: any) => ({ ...g, adicionais: ag.get(String(g.id)) || [] })) } }, 200, "public, max-age=30, stale-while-revalidate=60"); }
export async function unitAvailability(ctx: RouteContext, empresaId: string, unidadeId: string) {
  if (!uuid(empresaId) || !uuid(unidadeId)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante ou da unidade inválido.");
  const restaurant = await ctx.db.from("empresas_catalogo").select("id,status").eq("id", empresaId).maybeSingle();
  if (restaurant.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante.");
  if (!restaurant.data) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado.");
  const quando = ctx.url.searchParams.get("quando") || new Date().toISOString();
  const { data, error: e } = await ctx.db.rpc("empresa_disponibilidade_unidade", { p_empresa_id: empresaId, p_unidade_id: unidadeId, p_quando: quando });
  if (e) return error(ctx.request, 502, "falha_disponibilidade", "Não foi possível consultar a disponibilidade da unidade.");
  return response(ctx.request, { data: data || { aberto: false } }, 200, "public, max-age=15, stale-while-revalidate=30");
}
export async function availability(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const restaurant = await ctx.db.from("empresas_catalogo").select("id,status").eq("id", id).maybeSingle(); if (restaurant.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar o restaurante."); if (!restaurant.data) return error(ctx.request, 404, "nao_encontrado", "Restaurante não encontrado."); const quando = ctx.url.searchParams.get("quando") || new Date().toISOString(); const { data, error: e } = await ctx.db.rpc("empresa_disponibilidade", { p_empresa_id: id, p_quando: quando }); if (e) return error(ctx.request, 502, "falha_disponibilidade", "Não foi possível consultar a disponibilidade."); return response(ctx.request, { data: data || { aberto: false } }, 200, "public, max-age=15, stale-while-revalidate=30"); }
export async function reviewsSummary(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const { data, error: e } = await ctx.db.from("avaliacoes_resumo").select("empresa_id,quantidade_avaliacoes,nota_media").eq("empresa_id", id).maybeSingle(); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar o resumo das avaliações."); return response(ctx.request, { data: data || { empresa_id: id, quantidade_avaliacoes: 0, nota_media: 0 } }, 200, "public, max-age=60, stale-while-revalidate=120"); }
export async function reviewsSummaryAll(ctx: RouteContext) { const { data, error: e } = await ctx.db.from("avaliacoes_resumo").select("empresa_id,quantidade_avaliacoes,nota_media"); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar os resumos das avaliações."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=60, stale-while-revalidate=120"); }
export async function reviews(ctx: RouteContext, id: string) { if (!uuid(id)) return error(ctx.request, 400, "id_invalido", "Identificador do restaurante inválido."); const limit = Math.min(Math.max(Number(ctx.url.searchParams.get("limite") || 9), 1), 50); const { data, error: e } = await ctx.db.from("avaliacoes").select("id,nota,comentario,resposta,autor_nome,autor_avatar_url,created_at").eq("empresa_id", id).order("created_at", { ascending: false }).limit(limit); if (e) return error(ctx.request, 502, "falha_avaliacoes", "Não foi possível consultar as avaliações."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=30, stale-while-revalidate=60"); }
export async function searchPublicProducts(ctx: RouteContext) {
  const rawTerm = str(ctx.url.searchParams.get("busca"), 80);
  const term = (rawTerm || "").replace(/[\\%_]/g, "").trim();
  const limit = int(ctx.url.searchParams.get("limite") || 20, 1, 30);
  if (!term || term.length < 2 || limit === null) {
    return error(ctx.request, 400, "parametro_invalido", "Informe uma busca com pelo menos 2 caracteres e um limite válido.");
  }

  const pattern = `%${term}%`;
  const [nameQuery, descriptionQuery, variantQuery] = await Promise.all([
    ctx.db.from("produtos")
      .select("id,empresa_id,nome")
      .eq("disponivel", true)
      .ilike("nome", pattern)
      .limit(100),
    ctx.db.from("produtos")
      .select("id,empresa_id,nome")
      .eq("disponivel", true)
      .ilike("descricao", pattern)
      .limit(100),
    ctx.db.from("produto_variantes")
      .select("produto_id")
      .eq("ativo", true)
      .ilike("nome", pattern)
      .limit(100),
  ]);

  if (nameQuery.error || descriptionQuery.error || variantQuery.error) {
    return error(ctx.request, 502, "busca_indisponivel", "Não foi possível pesquisar os cardápios.");
  }

  const products = new Map<string, { id: string; empresa_id: string; nome: string }>();
  for (const item of [...(nameQuery.data || []), ...(descriptionQuery.data || [])] as any[]) {
    products.set(String(item.id), { id: String(item.id), empresa_id: String(item.empresa_id), nome: String(item.nome || "") });
  }

  const variantProductIds = [...new Set((variantQuery.data || []).map((item: any) => String(item.produto_id)))];
  if (variantProductIds.length) {
    const variantProducts = await ctx.db.from("produtos")
      .select("id,empresa_id,nome")
      .eq("disponivel", true)
      .in("id", variantProductIds)
      .limit(100);
    if (variantProducts.error) {
      return error(ctx.request, 502, "busca_indisponivel", "Não foi possível pesquisar os cardápios.");
    }
    for (const item of variantProducts.data || []) {
      products.set(String(item.id), { id: String(item.id), empresa_id: String(item.empresa_id), nome: String(item.nome || "") });
    }
  }

  const productList = [...products.values()];
  if (!productList.length) {
    return response(ctx.request, { data: [] }, 200, "public, max-age=15, stale-while-revalidate=30");
  }

  const companyIds = [...new Set(productList.map((item) => item.empresa_id))];
  const companies = await ctx.db.from("empresas_catalogo")
    .select(RESTAURANT_FIELDS)
    .eq("status", true)
    .in("id", companyIds);
  if (companies.error) {
    return error(ctx.request, 502, "busca_indisponivel", "Não foi possível pesquisar os cardápios.");
  }

  const activeCompanies = new Map((companies.data || []).map((item: any) => [String(item.id), item]));
  const data = productList
    .filter((item) => activeCompanies.has(item.empresa_id))
    .slice(0, limit)
    .map((item) => ({ ...item, empresa: activeCompanies.get(item.empresa_id) }));
  return response(ctx.request, { data }, 200, "public, max-age=15, stale-while-revalidate=30");
}

export async function publicHighlights(ctx: RouteContext) { const restaurantQuery = await ctx.db.from("empresas_catalogo").select("id").eq("status", true).order("nome").limit(20); if (restaurantQuery.error) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os destaques."); const ids = (restaurantQuery.data || []).map((item: any) => String(item.id)); if (!ids.length) return response(ctx.request, { data: [] }, 200, "public, max-age=30, stale-while-revalidate=60"); const { data, error: e } = await ctx.db.from("produtos").select("id,nome,descricao,imagem,preco,promocao,empresa_id").in("empresa_id", ids).eq("disponivel", true).order("nome").limit(6); if (e) return error(ctx.request, 502, "falha_catalogo", "Não foi possível consultar os produtos em destaque."); return response(ctx.request, { data: data || [] }, 200, "public, max-age=30, stale-while-revalidate=60"); }
