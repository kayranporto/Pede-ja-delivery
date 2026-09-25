import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const ADMIN_PERMISSIONS = [
  "overview",
  "pedidos",
  "financeiro",
  "entregas",
  "areas",
  "restaurantes",
  "usuarios",
  "cupons",
  "marketing",
  "relatorios",
  "suporte",
  "configuracoes",
  "administradores"
] as const;

type AdminPermission = typeof ADMIN_PERMISSIONS[number];

function normalizePermissions(input: unknown): AdminPermission[] {
  if (!Array.isArray(input)) return [...ADMIN_PERMISSIONS];
  const normalized = [...new Set(
    input.filter((value): value is string => typeof value === "string")
      .filter((value) => (ADMIN_PERMISSIONS as readonly string[]).includes(value))
  )] as AdminPermission[];
  return normalized.length ? normalized : [...ADMIN_PERMISSIONS];
}

function userPermissions(user: any): AdminPermission[] {
  const raw = user?.app_metadata?.admin_permissions;
  return normalizePermissions(raw);
}

function canManageAdmins(user: any): boolean {
  const raw = user?.app_metadata?.admin_permissions;
  if (!Array.isArray(raw) || !raw.length) return true;
  const normalized = normalizePermissions(raw);
  return normalized.includes("administradores");
}

function adminMetadata(user: any, permissions: AdminPermission[]) {
  return { ...(user?.app_metadata || {}), role: "admin", admin_permissions: permissions };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: corsHeaders });
}
function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: { message } }), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return fail("Método não permitido.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return fail("Configuração administrativa indisponível.", 503);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return fail("Autenticação obrigatória.", 401);

  const { data: ehAdmin, error: adminError } = await userClient.rpc("usuario_eh_admin");
  if (adminError || ehAdmin !== true) return fail("Acesso administrativo negado.", 403);
  if (!canManageAdmins(user)) return fail("Permissão de administradores necessária.", 403);
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({}));
  const acao = typeof body?.acao === "string" ? body.acao : "";

  if (acao === "listar") {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return fail(error.message, 400);
    const admins = (data?.users || []).filter((item) => item.app_metadata?.role === "admin").map((item) => ({
      id: item.id,
      email: item.email || "",
      confirmado: Boolean(item.email_confirmed_at),
      criado_em: item.created_at,
      permissoes: userPermissions(item)
    }));
    return reply(admins);
  }

  if (acao === "convidar") {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail("Informe um e-mail válido.", 400);
    const existing = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing.error) return fail(existing.error.message, 400);
    const encontrado = (existing.data?.users || []).find((item) => item.email?.toLowerCase() === email);
    if (encontrado) {
      const metadata = encontrado.app_metadata?.role === "admin"
        ? { ...(encontrado.app_metadata || {}), role: "admin", admin_permissions: userPermissions(encontrado) }
        : adminMetadata(encontrado, [...ADMIN_PERMISSIONS]);
      const { error } = await adminClient.auth.admin.updateUserById(encontrado.id, { app_metadata: metadata });
      if (error) return fail(error.message, 400);
      return reply({ mensagem: "O usuário existente recebeu acesso administrativo.", permissoes: metadata.admin_permissions });
    }
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { nome: "Administrador PedeJá" } });
    if (inviteError || !invited.user) return fail(inviteError?.message || "Não foi possível enviar o convite.", 400);
    const { error: roleError } = await adminClient.auth.admin.updateUserById(invited.user.id, {
      app_metadata: adminMetadata(invited.user, [...ADMIN_PERMISSIONS])
    });
    if (roleError) return fail(roleError.message, 400);
    return reply({ mensagem: "Convite enviado por e-mail.", permissoes: [...ADMIN_PERMISSIONS] }, 201);
  }

  if (acao === "remover") {
    const usuarioId = typeof body?.usuario_id === "string" ? body.usuario_id : "";
    if (!usuarioId) return fail("Usuário inválido.", 400);
    if (usuarioId === user.id) return fail("Você não pode remover seu próprio acesso.", 400);
    const { data: alvo, error: alvoError } = await adminClient.auth.admin.getUserById(usuarioId);
    if (alvoError || !alvo.user) return fail("Administrador não encontrado.", 404);
    if (alvo.user.app_metadata?.role !== "admin") return fail("O usuário não possui acesso administrativo.", 400);
    const metadata = { ...(alvo.user.app_metadata || {}), role: "user" } as Record<string, unknown>;
    delete metadata.admin_permissions;
    const { error } = await adminClient.auth.admin.updateUserById(usuarioId, { app_metadata: metadata });
    if (error) return fail(error.message, 400);
    return reply({ mensagem: "Acesso administrativo removido." });
  }

  if (acao === "salvar_permissoes") {
    const usuarioId = typeof body?.usuario_id === "string" ? body.usuario_id : "";
    if (!usuarioId) return fail("Usuário inválido.", 400);
    const permissoes = normalizePermissions(body?.permissoes);
    if (usuarioId === user.id && !permissoes.includes("administradores")) {
      return fail("Você não pode remover seu próprio acesso à gestão de administradores.", 400);
    }
    const { data: alvo, error: alvoError } = await adminClient.auth.admin.getUserById(usuarioId);
    if (alvoError || !alvo.user) return fail("Administrador não encontrado.", 404);
    if (alvo.user.app_metadata?.role !== "admin") return fail("O usuário não possui acesso administrativo.", 400);

    const { error } = await adminClient.auth.admin.updateUserById(usuarioId, {
      app_metadata: adminMetadata(alvo.user, permissoes)
    });
    if (error) return fail(error.message, 400);

    const { error: auditError } = await adminClient.from("admin_auditoria").insert({
      admin_id: user.id,
      acao: "admin_permissoes_atualizadas",
      alvo_id: usuarioId,
      detalhes: { permissoes }
    });
    if (auditError) return fail(auditError.message, 400);

    return reply({ mensagem: "Permissões administrativas atualizadas.", permissoes });
  }

  return fail("Ação administrativa inválida.", 400);
});
