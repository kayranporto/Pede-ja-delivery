import { createClient } from "supabase";
function corsHeaders(request: Request) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("SITE_URL") || "")
    .split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (configured.length === 0) headers["Access-Control-Allow-Origin"] = "*";
  else if (origin && configured.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

type PlainObject = Record<string, unknown>;

function isUuid(value: unknown): boolean {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function checkoutUrlValida(value: unknown, mode: "sandbox" | "production"): boolean {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    const hostValido = host === "mercadopago.com" || host.endsWith(".mercadopago.com")
      || host === "mercadopago.com.br" || host.endsWith(".mercadopago.com.br");
    if (url.protocol !== "https:" || !hostValido) return false;
    const sandbox = host.startsWith("sandbox.");
    return mode === "sandbox" ? sandbox : !sandbox;
  } catch {
    return false;
  }
}

function resumoPlano(plano: PlainObject | null) {
  if (!plano) return null;
  return {
    id: plano.id,
    slug: plano.slug,
    nome: plano.nome,
    descricao: plano.descricao,
    preco_mensal: plano.preco_mensal,
    moeda: plano.moeda || "BRL",
    trial_dias: plano.trial_dias || 0,
    limite_unidades: plano.limite_unidades,
    limite_produtos: plano.limite_produtos,
    limite_funcionarios: plano.limite_funcionarios,
    limite_pedidos_mes: plano.limite_pedidos_mes,
    recursos: plano.recursos || {},
    interno: plano.interno === true,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request, ["POST"]) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authorization = request.headers.get("Authorization") || "";
    if (!supabaseUrl || !publishableKey || !serviceKey || !authorization) {
      return json(request, { error: "Não foi possível validar a sessão do restaurante." }, 503);
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user) return json(request, { error: "Sua sessão expirou. Entre novamente." }, 401);

    const body = await request.json().catch(() => ({})) as PlainObject;
    const action = String(body.action || "listar");
    if (action !== "listar" && action !== "iniciar" && action !== "cancelar") {
      return json(request, { error: "Ação de assinatura inválida." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("id,nome,email,usuario_id")
      .eq("usuario_id", user.id)
      .is("excluida_em", null)
      .limit(1)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa) return json(request, { error: "Não foi encontrado um restaurante vinculado à sua conta proprietária." }, 404);

    const { data: assinatura, error: assinaturaError } = await admin
      .from("empresa_assinaturas")
      .select("id,empresa_id,plano_id,status,inicio_em,trial_fim_em,periodo_inicio,periodo_fim,cancelada_em,provider,provider_customer_id,provider_subscription_id,metadata")
      .eq("empresa_id", empresa.id)
      .maybeSingle();
    if (assinaturaError) throw assinaturaError;
    if (!assinatura) return json(request, { error: "A assinatura deste restaurante ainda não foi configurada." }, 409);

    const { data: planoAtual, error: planoAtualError } = await admin
      .from("planos_plataforma")
      .select("id,slug,nome,descricao,preco_mensal,moeda,trial_dias,limite_unidades,limite_produtos,limite_funcionarios,limite_pedidos_mes,recursos,interno")
      .eq("id", assinatura.plano_id)
      .maybeSingle();
    if (planoAtualError) throw planoAtualError;

    if (action === "listar") {
      const { data: planos, error: planosError } = await admin
        .from("planos_plataforma")
        .select("id,slug,nome,descricao,preco_mensal,moeda,trial_dias,limite_unidades,limite_produtos,limite_funcionarios,limite_pedidos_mes,recursos,interno,ativo,ordem")
        .eq("ativo", true)
        .eq("interno", false)
        .gt("preco_mensal", 0)
        .order("ordem", { ascending: true });
      if (planosError) throw planosError;
      return json(request, {
        empresa: { id: empresa.id, nome: empresa.nome },
        planos: (planos || []).map((plano: PlainObject) => resumoPlano(plano)),
        assinatura: {
          status: assinatura.status,
          inicio_em: assinatura.inicio_em,
          trial_fim_em: assinatura.trial_fim_em,
          periodo_inicio: assinatura.periodo_inicio,
          periodo_fim: assinatura.periodo_fim,
          provider: assinatura.provider,
          possui_assinatura_online: Boolean(assinatura.provider_subscription_id),
          plano: resumoPlano(planoAtual),
        },
        cobranca_online_ativada: Deno.env.get("MERCADO_PAGO_SUBSCRIPTIONS_ENABLED") === "true",
      });
    }

    if (action === "cancelar") {
      const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
      const expectedCollectorId = Deno.env.get("MERCADO_PAGO_COLLECTOR_ID") || "";
      const mode = String(Deno.env.get("MERCADO_PAGO_ENVIRONMENT") || "sandbox").toLowerCase() === "production"
        ? "production" : "sandbox";
      if (!accessToken || !expectedCollectorId) return json(request, { error: "A configuração do Mercado Pago está incompleta." }, 503);
      const tokenIsTest = accessToken.startsWith("TEST-");
      if ((mode === "sandbox" && !tokenIsTest) || (mode === "production" && tokenIsTest)) {
        return json(request, { error: "A credencial do Mercado Pago não corresponde ao ambiente configurado." }, 503);
      }
      if (assinatura.provider !== "mercado_pago" || !assinatura.provider_subscription_id || assinatura.status !== "ativa") {
        return json(request, { error: "Não foi encontrada uma assinatura recorrente ativa para cancelar." }, 409);
      }
      const id = String(assinatura.provider_subscription_id);
      const subscriptionResponse = await fetch("https://api.mercadopago.com/preapproval/" + encodeURIComponent(id), {
        headers: { Authorization: "Bearer " + accessToken },
      });
      const subscriptionResource = await subscriptionResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (!subscriptionResponse.ok || String(subscriptionResource.id || "") !== id) {
        return json(request, { error: "Não foi possível confirmar a assinatura no Mercado Pago." }, 502);
      }
      if (String(subscriptionResource.external_reference || "") !== String(empresa.id)
        || String(subscriptionResource.collector_id || "") !== expectedCollectorId
        || (typeof subscriptionResource.live_mode === "boolean" && subscriptionResource.live_mode !== (mode === "production"))) {
        return json(request, { error: "A assinatura do provedor não corresponde a este restaurante ou ambiente." }, 409);
      }
      const cancelResponse = await fetch("https://api.mercadopago.com/preapproval/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const result = await cancelResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (!cancelResponse.ok || String(result.id || "") !== id) {
        console.error("Falha ao solicitar cancelamento Mercado Pago", { status: cancelResponse.status });
        return json(request, { error: "O Mercado Pago não confirmou o pedido de cancelamento." }, 502);
      }
      return json(request, { ok: true, message: "Cancelamento solicitado. O status será atualizado após a confirmação do provedor." });
    }

    const subscriptionsEnabled = Deno.env.get("MERCADO_PAGO_SUBSCRIPTIONS_ENABLED") === "true";
    if (!subscriptionsEnabled) {
      return json(request, {
        error: "A assinatura online ainda não está ativada. Os planos estão disponíveis, mas a cobrança será liberada depois da configuração e validação do Mercado Pago.",
        code: "SUBSCRIPTIONS_DISABLED",
      }, 503);
    }

    const planId = String(body.plano_id || "");
    if (!isUuid(planId)) return json(request, { error: "Escolha um plano válido." }, 400);
    const { data: plano, error: planoError } = await admin
      .from("planos_plataforma")
      .select("id,slug,nome,descricao,preco_mensal,moeda,ativo,interno,recursos")
      .eq("id", planId)
      .maybeSingle();
    if (planoError) throw planoError;
    if (!plano || plano.ativo !== true || plano.interno === true || Number(plano.preco_mensal) <= 0 || plano.moeda !== "BRL") {
      return json(request, { error: "Este plano não está disponível para assinatura." }, 400);
    }

    const metadata = assinatura.metadata && typeof assinatura.metadata === "object"
      ? assinatura.metadata as Record<string, unknown> : {};
    const pending = metadata.assinatura_pendente && typeof metadata.assinatura_pendente === "object"
      ? metadata.assinatura_pendente as Record<string, unknown> : null;
    const mode = String(Deno.env.get("MERCADO_PAGO_ENVIRONMENT") || "sandbox").toLowerCase() === "production"
      ? "production" : "sandbox";
    if (pending?.plano_id === planId && pending?.checkout_url
      && pending?.ambiente === mode && checkoutUrlValida(pending.checkout_url, mode)) {
      return json(request, {
        checkout_url: String(pending.checkout_url),
        reutilizada: true,
        ambiente: mode,
      });
    }
    if (pending?.provider_subscription_id) {
      return json(request, { error: "Já existe uma solicitação de assinatura em andamento. Finalize o checkout aberto antes de escolher outro plano." }, 409);
    }
    if (assinatura.provider_subscription_id && !["cancelada", "expirada"].includes(String(assinatura.status))) {
      return json(request, { error: "Já existe uma assinatura recorrente associada a este restaurante. Regularize ou cancele a assinatura atual no provedor antes de iniciar outra." }, 409);
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
    const expectedCollectorId = Deno.env.get("MERCADO_PAGO_COLLECTOR_ID") || "";
    const siteUrl = String(Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
    if (!accessToken || !expectedCollectorId || !siteUrl) {
      return json(request, { error: "Falta configurar credenciais, conta recebedora ou URL do site para assinaturas." }, 503);
    }
    const tokenIsTest = accessToken.startsWith("TEST-");
    if ((mode === "sandbox" && !tokenIsTest) || (mode === "production" && tokenIsTest)) {
      return json(request, { error: "A credencial do Mercado Pago não corresponde ao ambiente de assinatura configurado." }, 503);
    }
    let siteOrigin: URL;
    try {
      siteOrigin = new URL(siteUrl);
    } catch {
      return json(request, { error: "A URL do site configurada no servidor é inválida." }, 503);
    }
    if (siteOrigin.protocol !== "https:") return json(request, { error: "A URL do site precisa usar HTTPS." }, 503);

    const payerEmail = String(user.email || empresa.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return json(request, { error: "Adicione um e-mail válido à conta proprietária antes de contratar um plano." }, 400);
    }

    const { data: providerAccount, error: providerAccountError } = await admin
      .from("empresa_assinaturas")
      .select("provider,provider_customer_id,provider_subscription_id,plano_id,status,metadata")
      .eq("empresa_id", empresa.id)
      .maybeSingle();
    if (providerAccountError) throw providerAccountError;

    const notificationUrl = supabaseUrl + "/functions/v1/mercado-pago-assinaturas-webhook";
    const backUrl = siteUrl + "/html/empresa-dashboard.html?assinatura=retorno#plano";
    const amount = Math.round(Number(plano.preco_mensal) * 100) / 100;
    const idemKey = "pedeja-sub-" + empresa.id + "-" + plano.id + "-" + crypto.randomUUID();
    const providerResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify({
        reason: ("PedeJá Delivery - Plano " + plano.nome).slice(0, 200),
        external_reference: empresa.id,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: "BRL",
        },
        back_url: backUrl,
        notification_url: notificationUrl,
        metadata: {
          integracao: "pedeja_assinaturas_v1",
          empresa_id: empresa.id,
          plano_id: plano.id,
          plano_slug: plano.slug,
          ambiente: mode,
        },
      }),
    });

    const provider = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!providerResponse.ok || !provider.id) {
      console.error("Falha ao criar assinatura Mercado Pago", { status: providerResponse.status, code: provider.error || provider.message, mode });
      return json(request, { error: "O Mercado Pago não conseguiu iniciar esta assinatura. Nenhuma cobrança foi ativada." }, 502);
    }
    const checkoutUrl = mode === "sandbox"
      ? String(provider.sandbox_init_point || provider.init_point || "")
      : String(provider.init_point || "");
    if (!checkoutUrlValida(checkoutUrl, mode)) {
      console.error("URL de checkout de assinatura incompatível com o ambiente", { mode, host: (() => { try { return new URL(checkoutUrl).hostname; } catch { return ""; } })() });
      return json(request, { error: "O provedor não retornou um checkout compatível com o ambiente configurado." }, 502);
    }

    const pendingMetadata = {
      provider_subscription_id: String(provider.id),
      plano_id: planId,
      plano_slug: plano.slug,
      expected_amount: amount,
      currency_id: "BRL",
      checkout_url: checkoutUrl,
      ambiente: mode,
      solicitado_em: new Date().toISOString(),
      previous_provider: providerAccount?.provider || null,
      previous_provider_customer_id: providerAccount?.provider_customer_id || null,
      previous_provider_subscription_id: providerAccount?.provider_subscription_id || null,
      previous_metadata: providerAccount?.metadata && typeof providerAccount.metadata === "object" ? providerAccount.metadata : {},
    };
    const mergedMetadata = { ...metadata, assinatura_pendente: pendingMetadata };
    const { error: updateError } = await admin
      .from("empresa_assinaturas")
      .update({
        provider: "mercado_pago",
        provider_customer_id: provider.payer_id ? String(provider.payer_id) : null,
        provider_subscription_id: String(provider.id),
        metadata: mergedMetadata,
      })
      .eq("empresa_id", empresa.id);
    if (updateError) throw updateError;

    return json(request, {
      checkout_url: checkoutUrl,
      reutilizada: false,
      ambiente: mode,
      plano: resumoPlano(plano),
    });
  } catch (error) {
    console.error("Erro na gestão de assinatura", error);
    return json(request, { error: "Não foi possível concluir a solicitação de assinatura." }, 500);
  }
});
