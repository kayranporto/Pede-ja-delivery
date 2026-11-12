import type { Json, RouteContext } from "../../_shared/api/types.ts";
import { error, response } from "../../_shared/api/http.ts";
import { int, str } from "../../_shared/api/validation.ts";
import { authUser } from "../../_shared/api/supabase.ts";
import { rpc } from "../../_shared/api/rpc.ts";

const ADMIN_PERMISSION_KEYS = [
  "overview","pedidos","financeiro","entregas","areas","restaurantes","usuarios",
  "cupons","marketing","relatorios","suporte","configuracoes","administradores","categorias_filtros"
] as const;

const FILTER_CATEGORY_FIELDS = "id,nome,icone,ordem,aliases";

function normalizeAdminPermissions(value: unknown): Set<string> {
  // Mantém o mesmo comportamento do painel e de private.admin_permissoes():
  // admins antigos sem uma lista válida continuam com acesso total por compatibilidade.
  const todas = new Set<string>(ADMIN_PERMISSION_KEYS);
  if (!Array.isArray(value) || value.length === 0) return todas;

  const permissões = new Set(
    value.filter((item): item is string =>
      typeof item === "string" && (ADMIN_PERMISSION_KEYS as readonly string[]).includes(item)
    )
  );
  return permissões.size ? permissões : todas;
}

export async function getAdminAccess(ctx: RouteContext) {
  const user = await authUser(ctx.db);
  if (!user || user.app_metadata?.role !== "admin") return null;
  return { user, permissions: normalizeAdminPermissions(user.app_metadata?.admin_permissions) };
}

export async function checkAdminPermission(ctx: RouteContext, permission: string) {
  const access = await getAdminAccess(ctx);
  if (!access) return error(ctx.request,403,"acesso_negado","Acesso administrativo negado.");
  if (!access.permissions.has(permission)) return error(ctx.request,403,"permissao_negada","Esta conta não possui permissão para esta área da administração.");
  return null;
}

function adminTemAlgumaPermissao(permissoes: Set<string>, ...chaves: string[]) {
  return chaves.some((chave) => permissoes.has(chave));
}

export async function adminOperation(ctx: RouteContext) {
  const access = await getAdminAccess(ctx);
  if (!access) return error(ctx.request,403,"acesso_negado","Acesso administrativo negado.");
  const podeSuporte = access.permissions.has("suporte");
  const podeFinanceiro = access.permissions.has("financeiro");
  const podePedidos = access.permissions.has("pedidos");
  const [chamados,reembolsos,cancelamentos,conciliacao] = await Promise.all([
    podeSuporte
      ? ctx.db.from("chamados_suporte").select("id,assunto,mensagem,status,prioridade,created_at").in("status",["aberto","em_analise"]).order("prioridade",{ascending:false}).order("created_at").limit(50)
      : Promise.resolve({data:[],error:null}),
    podeFinanceiro
      ? ctx.db.from("pedidos").select("id,numero,empresa_nome,cliente_nome,total,reembolso_status,pagamento_reconciliacao_status").in("reembolso_status",["aguardando_pagamento","pendente","processando","falhou"]).order("updated_at").limit(50)
      : Promise.resolve({data:[],error:null}),
    podePedidos
      ? ctx.db.from("pedidos").select("id,numero,empresa_nome,cliente_nome,cancelamento_motivo").eq("cancelamento_status","solicitado").order("cancelamento_solicitado_em").limit(50)
      : Promise.resolve({data:[],error:null}),
    podeFinanceiro
      ? ctx.db.rpc("admin_conciliacao_pagamentos",{p_limite:50})
      : Promise.resolve({data:{pedidos:[]},error:null})
  ]);
  const e=chamados.error||reembolsos.error||cancelamentos.error||conciliacao.error;
  if(e) return error(ctx.request,502,"operacao_admin_indisponivel","Não foi possível carregar a operação administrativa.");
  return response(ctx.request,{data:{chamados:chamados.data||[],reembolsos:reembolsos.data||[],cancelamentos:cancelamentos.data||[],conciliacao:conciliacao.data?.pedidos||[]}});
}

export async function adminDashboard(ctx: RouteContext) {
  const access = await getAdminAccess(ctx);
  if (!access) return error(ctx.request,403,"acesso_negado","Acesso administrativo negado.");
  const p = access.permissions;
  const carregaEmpresas = adminTemAlgumaPermissao(p,"overview","pedidos","financeiro","entregas","areas","restaurantes","marketing","relatorios");
  const carregaUsuarios = adminTemAlgumaPermissao(p,"overview","usuarios");
  const carregaPedidos = adminTemAlgumaPermissao(p,"overview","pedidos","financeiro","entregas","marketing","relatorios");
  const carregaCupons = adminTemAlgumaPermissao(p,"cupons","marketing");
  const carregaLogs = adminTemAlgumaPermissao(p,"relatorios");
  const carregaRegioes = adminTemAlgumaPermissao(p,"areas");
  const [empresas,usuarios,pedidos,cupons,logs,auditoria,regioes,unidades] = await Promise.all([
    carregaEmpresas
      ? ctx.db.from("empresas").select("id,nome,status,telefone,email,usuario_id,categoria,descricao,taxa_entrega,pedido_minimo,tempo_estimado_min,tempo_estimado_max,publicado,cidade_atendimento,uf_atendimento,bairros_atendidos,created_at,updated_at,excluida_em").is("excluida_em",null).order("created_at",{ascending:false})
      : Promise.resolve({data:[],error:null}),
    carregaUsuarios
      ? ctx.db.from("usuarios").select("id,nome,sobrenome,telefone,avatar_url,bloqueado,created_at").order("created_at",{ascending:false})
      : Promise.resolve({data:[],error:null}),
    carregaPedidos
      ? ctx.db.from("pedidos").select("id,numero,usuario_id,empresa_id,empresa_nome,cliente_nome,cliente_telefone,status,total,pagamento_status,pagamento_modalidade,agendado_para,subtotal,desconto,taxa_entrega,endereco,created_at,updated_at").order("created_at",{ascending:false}).limit(5000)
      : Promise.resolve({data:[],error:null}),
    carregaCupons
      ? ctx.db.from("cupons").select("id,empresa_id,codigo,tipo,valor,desconto,pedido_minimo,ativo,usos,limite_usos,primeiro_pedido,inicio,fim,validade,max_desconto,limite_por_usuario,created_at").order("created_at",{ascending:false})
      : Promise.resolve({data:[],error:null}),
    carregaLogs
      ? ctx.db.from("app_logs").select("nivel,contexto,mensagem,pagina,created_at").order("created_at",{ascending:false}).limit(50)
      : Promise.resolve({data:[],error:null}),
    carregaLogs
      ? ctx.db.from("admin_auditoria").select("acao,alvo_id,detalhes,created_at").order("created_at",{ascending:false}).limit(30)
      : Promise.resolve({data:[],error:null}),
    carregaRegioes
      ? ctx.db.from("empresa_regioes").select("id,empresa_id,unidade_id,bairro,cidade,uf,taxa_entrega,pedido_minimo,tempo_min,tempo_max,ativo,created_at,updated_at").order("bairro").limit(5000)
      : Promise.resolve({data:[],error:null}),
    carregaRegioes
      ? ctx.db.from("empresa_unidades").select("id,empresa_id,nome,cidade,uf,ativa,principal,frete_distancia_ativo,frete_taxa_base,frete_valor_km,frete_raio_max_km").order("nome").limit(1000)
      : Promise.resolve({data:[],error:null})
  ]);
  const first = [empresas,usuarios,pedidos,cupons,logs,auditoria,regioes,unidades].find((r) => r.error);
  if (first) return error(ctx.request,502,"admin_dados_indisponiveis","Não foi possível carregar os dados administrativos.");
  return response(ctx.request,{data:{
    empresas:empresas.data||[],usuarios:usuarios.data||[],pedidos:pedidos.data||[],cupons:cupons.data||[],
    logs:logs.data||[],auditoria:auditoria.data||[],regioes:regioes.data||[],unidades:unidades.data||[]
  }},200,"no-store");
}

export async function adminAction(ctx: RouteContext, body: Json) {
  const access = await getAdminAccess(ctx);
  if (!access) return error(ctx.request,403,"acesso_negado","Acesso administrativo negado.");
  const action = str(body.acao,80);
  const required = ({
    entregador:"entregas", usuario_bloqueio:"usuarios", cupom_status:"cupons", cupom_salvar:"cupons", cupom_excluir:"cupons",
    restaurante_status:"restaurantes", restaurante_atualizar:"restaurantes", restaurante_excluir:"restaurantes",
    regiao_salvar:"areas", regiao_status:"areas", regiao_excluir:"areas", pedido_detalhe:"pedidos", relatorios:"relatorios"
  } as Record<string,string>)[action];
  if (!required) return error(ctx.request,400,"acao_invalida","Ação administrativa inválida.");
  if (!access.permissions.has(required)) return error(ctx.request,403,"permissao_negada","Esta conta não possui permissão para esta ação administrativa.");
  const args: Json = {};
  if (action === "entregador") { args.p_entregador_id=String(body.entregador_id||""); args.p_aprovado=body.aprovado===true; return rpc(ctx.db,ctx.request,"admin_definir_entregador",args); }
  if (action === "usuario_bloqueio") { args.p_usuario_id=String(body.usuario_id||""); args.p_bloqueado=body.bloqueado===true; return rpc(ctx.db,ctx.request,"admin_definir_usuario_bloqueio",args); }
  if (action === "cupom_status") { args.p_cupom_id=String(body.cupom_id||""); args.p_ativo=body.ativo===true; return rpc(ctx.db,ctx.request,"admin_definir_cupom",args); }
  if (action === "cupom_salvar") return rpc(ctx.db,ctx.request,"admin_salvar_cupom",{p_codigo:str(body.codigo,100),p_tipo:str(body.tipo,40),p_valor:Number(body.valor||0),p_empresa_id:body.empresa_id||null,p_pedido_minimo:Number(body.pedido_minimo||0),p_limite_usos:body.limite_usos??null,p_primeiro_pedido:body.primeiro_pedido===true,p_inicio:body.inicio||new Date().toISOString(),p_fim:body.fim||null,p_max_desconto:body.max_desconto??null,p_limite_por_usuario:Number(body.limite_por_usuario||1),p_cupom_id:body.cupom_id||null,p_ativo:body.ativo!==false});
  if (action === "cupom_excluir") return rpc(ctx.db,ctx.request,"admin_excluir_cupom",{p_cupom_id:String(body.cupom_id||"")});
  if (action === "restaurante_status") return rpc(ctx.db,ctx.request,"admin_definir_restaurante",{p_empresa_id:String(body.empresa_id||""),p_publicado:body.publicado===true,p_status:body.status===true});
  if (action === "restaurante_atualizar") return rpc(ctx.db,ctx.request,"admin_atualizar_restaurante",{p_empresa_id:String(body.p_empresa_id||body.empresa_id||""),p_nome:str(body.p_nome||body.nome,160),p_email:str(body.p_email||body.email,320),p_telefone:str(body.p_telefone||body.telefone,40),p_categoria:str(body.p_categoria||body.categoria,100),p_descricao:str(body.p_descricao||body.descricao,3000),p_taxa_entrega:Number(body.p_taxa_entrega??body.taxa_entrega??0),p_pedido_minimo:Number(body.p_pedido_minimo??body.pedido_minimo??0),p_tempo_min:Number(body.p_tempo_min??body.tempo_min??25),p_tempo_max:Number(body.p_tempo_max??body.tempo_max??45),p_publicado:body.p_publicado===true||body.publicado===true,p_status:body.p_status===true||body.status===true});
  if (action === "restaurante_excluir") return rpc(ctx.db,ctx.request,"admin_excluir_restaurante",{p_empresa_id:String(body.p_empresa_id||body.empresa_id||""),p_nome_confirmacao:str(body.p_nome_confirmacao||body.confirmacao,200)});
  if (action === "regiao_salvar") return rpc(ctx.db,ctx.request,"admin_regiao_salvar",{p_id:body.id||null,p_empresa_id:String(body.empresa_id||""),p_unidade_id:String(body.unidade_id||""),p_bairro:str(body.bairro,160),p_cidade:str(body.cidade,100),p_uf:str(body.uf,2)?.toUpperCase(),p_taxa_entrega:Number(body.taxa_entrega??0),p_pedido_minimo:Number(body.pedido_minimo??0),p_tempo_min:Number(body.tempo_min??25),p_tempo_max:Number(body.tempo_max??45),p_ativo:body.ativo!==false});
  if (action === "regiao_status") return rpc(ctx.db,ctx.request,"admin_regiao_status",{p_id:String(body.id||""),p_ativo:body.ativo===true});
  if (action === "regiao_excluir") return rpc(ctx.db,ctx.request,"admin_regiao_excluir",{p_id:String(body.id||"")});
  if (action === "pedido_detalhe") return rpc(ctx.db,ctx.request,"admin_obter_pedido",{p_pedido_id:String(body.pedido_id||"")});
  if (action === "relatorios") return response(ctx.request,{data:{
    operacional:(await ctx.db.rpc("admin_relatorio_operacional",{p_dias:Math.min(Number(body.dias||30),3650)})).data||null,
    inteligencia:(await ctx.db.rpc("admin_relatorio_clientes_produtos",{p_dias:Math.min(Number(body.dias||30),3650)})).data||null
  }});
  return error(ctx.request,400,"acao_invalida","Ação administrativa inválida.");
}

export async function checkFilterCategoryPermission(ctx: RouteContext) {
  const access = await getAdminAccess(ctx);
  if (!access) return error(ctx.request, 403, "acesso_negado", "Acesso administrativo negado.");
  if (!adminTemAlgumaPermissao(access.permissions, "categorias_filtros", "configuracoes", "administradores")) {
    return error(ctx.request, 403, "permissao_negada", "Esta conta não possui permissão para gerenciar os filtros da Home.");
  }
  return null;
}
const FILTER_CATEGORY_FIELDS = "id,nome,icone,ordem,aliases";

function normalizedFilterCategoryName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function parseFilterCategoryPayload(body: Json) {
  const nome = str(body.nome, 60)?.replace(/\s+/g, " ") || null;
  const icone = str(body.icone, 12) || "🍽️";
  const ordem = int(body.ordem, 0, 10000);
  if (!nome || !icone || ordem === null) return null;
  const rawAliases = Array.isArray(body.aliases)
    ? body.aliases.filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 60 && normalizedFilterCategoryName(value) !== normalizedFilterCategoryName(nome))
        .slice(0, 25)
    : [];
  const aliasesByName = new Map<string, string>();
  rawAliases.forEach((value) => aliasesByName.set(normalizedFilterCategoryName(value), value));
  return { nome, icone, ordem, aliases: [...aliasesByName.values()], updated_at: new Date().toISOString() };
}

function filterCategoryWriteError(ctx: RouteContext, dbError: { code?: string; message?: string }) {
  if (dbError.code === "23505") return error(ctx.request, 409, "categoria_duplicada", "Já existe uma categoria com esse nome.");
  console.error("Filter category write failed", { code: dbError.code });
  return error(ctx.request, 400, "categoria_recusada", "Não foi possível salvar a categoria. Verifique os dados e suas permissões.");
}

export async function listHomeFilterCategories(ctx: RouteContext) {
  const { data, error: e } = await ctx.db.from("categorias_filtros_home")
    .select(FILTER_CATEGORY_FIELDS)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (e) return error(ctx.request, 502, "categorias_indisponiveis", "Não foi possível carregar as categorias dos filtros.");
  return response(ctx.request, { data: data || [] }, 200, "public, max-age=30, stale-while-revalidate=60");
}

export async function createHomeFilterCategory(ctx: RouteContext, body: Json) {
  const denied = await checkFilterCategoryPermission(ctx);
  if (denied) return denied;
  const payload = parseFilterCategoryPayload(body);
  if (!payload) return error(ctx.request, 400, "categoria_invalida", "Informe nome, ícone e posição válida para a categoria.");
  const { data, error: e } = await ctx.db.from("categorias_filtros_home")
    .insert(payload).select(FILTER_CATEGORY_FIELDS).single();
  if (e) return filterCategoryWriteError(ctx, e);
  return response(ctx.request, { data });
}

export async function updateHomeFilterCategory(ctx: RouteContext, body: Json, id: string) {
  const denied = await checkFilterCategoryPermission(ctx);
  if (denied) return denied;
  const payload = parseFilterCategoryPayload(body);
  if (!payload) return error(ctx.request, 400, "categoria_invalida", "Informe nome, ícone e posição válida para a categoria.");
  const { data, error: e } = await ctx.db.from("categorias_filtros_home")
    .update(payload).eq("id", id).select(FILTER_CATEGORY_FIELDS).maybeSingle();
  if (e) return filterCategoryWriteError(ctx, e);
  if (!data) return error(ctx.request, 404, "categoria_nao_encontrada", "Categoria não encontrada.");
  return response(ctx.request, { data });
}

export async function deleteHomeFilterCategory(ctx: RouteContext, id: string) {
  const denied = await checkFilterCategoryPermission(ctx);
  if (denied) return denied;
  const { data, error: e } = await ctx.db.from("categorias_filtros_home")
    .delete().eq("id", id).select("id").maybeSingle();
  if (e) return filterCategoryWriteError(ctx, e);
  if (!data) return error(ctx.request, 404, "categoria_nao_encontrada", "Categoria não encontrada.");
  return response(ctx.request, { data: true });
}
