import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

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

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({}));
  const acao = typeof body?.acao === "string" ? body.acao : "";

  if (acao === "listar") {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return fail(error.message, 400);
    const admins = (data?.users || []).filter((item) => item.app_metadata?.role === "admin").map((item) => ({
      id: item.id, email: item.email || "", confirmado: Boolean(item.email_confirmed_at), criado_em: item.created_at
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
      const { error } = await adminClient.auth.admin.updateUserById(encontrado.id, { app_metadata: { ...(encontrado.app_metadata || {}), role: "admin" } });
      if (error) return fail(error.message, 400);
      return reply({ mensagem: "O usuário existente recebeu acesso administrativo." });
    }
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { nome: "Administrador PedeJá" } });
    if (inviteError || !invited.user) return fail(inviteError?.message || "Não foi possível enviar o convite.", 400);
    const { error: roleError } = await adminClient.auth.admin.updateUserById(invited.user.id, { app_metadata: { ...(invited.user.app_metadata || {}), role: "admin" } });
    if (roleError) return fail(roleError.message, 400);
    return reply({ mensagem: "Convite enviado por e-mail." }, 201);
  }

  if (acao === "remover") {
    const usuarioId = typeof body?.usuario_id === "string" ? body.usuario_id : "";
    if (!usuarioId) return fail("Usuário inválido.", 400);
    if (usuarioId === user.id) return fail("Você não pode remover seu próprio acesso.", 400);
    const { data: alvo, error: alvoError } = await adminClient.auth.admin.getUserById(usuarioId);
    if (alvoError || !alvo.user) return fail("Administrador não encontrado.", 404);
    if (alvo.user.app_metadata?.role !== "admin") return fail("O usuário não possui acesso administrativo.", 400);
    const { error } = await adminClient.auth.admin.updateUserById(usuarioId, { app_metadata: { ...(alvo.user.app_metadata || {}), role: "user" } });
    if (error) return fail(error.message, 400);
    return reply({ mensagem: "Acesso administrativo removido." });
  }

  return fail("Ação administrativa inválida.", 400);
});
