import type { Json, RouteContext } from "../../_shared/api/types.ts";
import { error, response } from "../../_shared/api/http.ts";
import { int, str, uuid } from "../../_shared/api/validation.ts";
import { rpc } from "../../_shared/api/rpc.ts";

export async function companyUnits(ctx: RouteContext) {
  const empresaId = str(ctx.url.searchParams.get("empresa_id"), 100);
  if (!empresaId) return error(ctx.request, 400, "parametro_invalido", "empresa_id é obrigatório.");
  const { data, error: e } = await ctx.db.from("empresa_unidades")
    .select("id,empresa_id,nome,slug,endereco,cidade,uf,telefone,ativa,principal,latitude,longitude,localizacao_atualizada_em,frete_distancia_ativo,frete_taxa_base,frete_valor_km,frete_raio_max_km,created_at,updated_at")
    .eq("empresa_id", empresaId)
    .order("principal", { ascending: false })
    .order("nome", { ascending: true });
  return e ? error(ctx.request, 502, "unidades_indisponiveis", "Não foi possível carregar as unidades.") : response(ctx.request, { data: data || [] });
}

export async function companyOperation(ctx: RouteContext) {
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

export async function companyUnitSave(ctx: RouteContext, body: Json) {
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

export async function companyOperationAction(ctx: RouteContext, body: Json) {
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

export async function companyPanel(ctx: RouteContext) {
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

export async function companyPanelAction(ctx: RouteContext, body: Json) {
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
    const relampago = body.relampago === true;
    const tituloRelampago = str(body.titulo_relampago, 70);
    const descricaoRelampago = str(body.descricao_relampago, 180);
    const limiteUsos = body.limite_usos == null || body.limite_usos === "" ? null : Number(body.limite_usos);
    const fimDate = body.fim ? new Date(String(body.fim)) : null;
    if (relampago && (
      !tituloRelampago || tituloRelampago.length < 4
      || (body.descricao_relampago != null && descricaoRelampago === null)
      || !Number.isInteger(limiteUsos) || Number(limiteUsos) < 1
      || !fimDate || !Number.isFinite(fimDate.getTime()) || fimDate.getTime() <= Date.now()
    )) return error(ctx.request,400,"oferta_relampago_invalida","Para destacar uma oferta, informe um título, um limite de usos positivo e uma data final futura.");
    const payload={empresa_id:empresaId,codigo:str(body.codigo,100),tipo:str(body.tipo,30),valor:Number(body.valor||0),pedido_minimo:Number(body.pedido_minimo||0),max_desconto:body.max_desconto==null?null:Number(body.max_desconto),limite_usos:limiteUsos,limite_por_usuario:Number(body.limite_por_usuario||1),primeiro_pedido:body.primeiro_pedido===true,fim:fimDate?fimDate.toISOString():null,relampago,titulo_relampago:relampago?tituloRelampago:null,descricao_relampago:relampago?(descricaoRelampago||null):null,ativo:true};
    if(!payload.codigo || !payload.tipo || !Number.isFinite(payload.valor)||payload.valor<0||!Number.isFinite(payload.pedido_minimo)||payload.pedido_minimo<0) return error(ctx.request,400,"cupom_invalido","Dados do cupom inválidos.");
    const {data,error:e}=await ctx.db.from("cupons").insert(payload).select("*").single();
    return e ? error(ctx.request,e.code==="23505"?409:400,e.code==="23505"?"cupom_duplicado":"cupom_recusado",relampago&&e.code==="23514"?"Os dados da oferta relâmpago são inválidos.":e.message) : response(ctx.request,{data});
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

export async function companyDrivers(ctx: RouteContext) { const unidadeId = str(ctx.url.searchParams.get("unidade_id"),100); if (!uuid(String(unidadeId || ""))) return error(ctx.request,400,"parametro_invalido","unidade_id inválido."); const { data, error: e } = await ctx.db.rpc("empresa_listar_entregadores_proprios",{p_unidade_id:unidadeId}); if(e) return error(ctx.request,400,"consulta_recusada",e.message || "Não foi possível consultar a equipe."); const { data: unidade } = await ctx.db.from("empresa_unidades").select("id,nome,empresa_id,ativa").eq("id",unidadeId).maybeSingle(); return response(ctx.request,{data:{unidade:unidade||null,entregadores:data||[]}}); }

export async function companyInitialize(ctx: RouteContext, body: Json) {
  const nome = str(body.nome, 160), email = str(body.email, 320), telefone = str(body.telefone, 40), cnpj = str(body.cnpj, 30);
  if (!nome || !email || !cnpj) return error(ctx.request, 400, "empresa_invalida", "Nome, e-mail e CNPJ são obrigatórios.");
  const { data: existente, error: consultaErro } = await ctx.db.from("empresas").select("*").eq("usuario_id", ctx.userId).maybeSingle();
  if (consultaErro) return error(ctx.request, 502, "empresa_indisponivel", "Não foi possível consultar o restaurante.");
  if (existente) return response(ctx.request, { data: existente });
  const { data, error: e } = await ctx.db.from("empresas").insert({ usuario_id: ctx.userId, nome, email, telefone: telefone || null, cnpj, status: false, taxa_entrega: 0, pedido_minimo: 0 }).select("*").single();
  return e ? error(ctx.request, e.code === "23505" ? 409 : 400, "empresa_recusada", e.message) : response(ctx.request, { data }, 201);
}
