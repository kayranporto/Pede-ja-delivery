import { createClient } from "supabase";

function response(status = 200, body = "ok") {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function validSignature(request: Request, dataId: string, secret: string) {
  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    signature.split(",").map((part) => part.trim().split("=", 2)).filter((part) => part.length === 2),
  );
  if (!parts.ts || !parts.v1 || !requestId || !dataId) return false;
  const manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + parts.ts + ";";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  return constantTimeEqual(expected, String(parts.v1).toLowerCase());
}

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function amountEqual(a: unknown, b: unknown) {
  const left = Number(a);
  const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && Math.round(left * 100) === Math.round(right * 100);
}

function responseMetadata(existing: unknown) {
  return { ...asObject(existing) };
}

async function providerGet(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Falha ao consultar assinatura Mercado Pago", { status: response.status });
    throw new Error("provider_unavailable");
  }
  return asObject(data);
}

async function loadContext(admin: ReturnType<typeof createClient>, resource: Record<string, any>, providerId: string, expectedCollectorId: string, mode: string) {
  if (resource.id == null || String(resource.id) !== providerId) return null;
  if (String(resource.collector_id || "") !== expectedCollectorId) return null;
  if (typeof resource.live_mode === "boolean" && resource.live_mode !== (mode === "production")) return null;
  const empresaId = String(resource.external_reference || "");
  if (!isUuid(empresaId)) return null;

  const { data: assinatura, error: assinaturaError } = await admin
    .from("empresa_assinaturas")
    .select("id,empresa_id,plano_id,status,inicio_em,trial_fim_em,periodo_inicio,periodo_fim,cancelada_em,provider,provider_customer_id,provider_subscription_id,metadata")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (assinaturaError) throw assinaturaError;
  if (!assinatura) return null;

  const metadata = responseMetadata(assinatura.metadata);
  const pending = asObject(metadata.assinatura_pendente);
  const providerMetadata = asObject(resource.metadata);
  const pendingMatches = String(pending.provider_subscription_id || "") === providerId;
  const activeMatches = String(assinatura.provider_subscription_id || "") === providerId;
  if (!pendingMatches && !activeMatches) return null;

  const planId = String((pendingMatches ? pending.plano_id : assinatura.plano_id) || providerMetadata.plano_id || "");
  if (!isUuid(planId)) return null;
  if (providerMetadata.integracao && providerMetadata.integracao !== "pedeja_assinaturas_v1") return null;
  if (providerMetadata.empresa_id && String(providerMetadata.empresa_id) !== empresaId) return null;
  if (providerMetadata.plano_id && String(providerMetadata.plano_id) !== planId) return null;

  const { data: plano, error: planoError } = await admin
    .from("planos_plataforma")
    .select("id,slug,nome,preco_mensal,moeda,ativo,interno")
    .eq("id", planId)
    .maybeSingle();
  if (planoError) throw planoError;
  if (!plano || plano.ativo !== true || plano.interno === true) return null;

  const recurring = asObject(resource.auto_recurring);
  const providerInfo = asObject(metadata.assinatura_provider);
  const expectedAmount = pendingMatches
    ? pending.expected_amount
    : providerInfo.preco_mensal ?? plano.preco_mensal;
  const currency = String(recurring.currency_id || "BRL");
  if (currency !== "BRL" || !amountEqual(recurring.transaction_amount, expectedAmount)) {
    console.error("Valor/moeda da assinatura diverge do esperado", { providerId, planId, currency });
    return null;
  }

  return {
    assinatura,
    metadata,
    pending,
    pendingMatches,
    activeMatches,
    empresaId,
    planId,
    plano,
    amount: Number(recurring.transaction_amount),
    currency,
  };
}

async function restorePreviousPending(admin: ReturnType<typeof createClient>, context: any, providerStatus: string) {
  const previousMetadata = responseMetadata(context.pending.previous_metadata);
  await admin.from("empresa_assinaturas").update({
    provider: context.pending.previous_provider || null,
    provider_customer_id: context.pending.previous_provider_customer_id || null,
    provider_subscription_id: context.pending.previous_provider_subscription_id || null,
    metadata: { ...previousMetadata, ultima_solicitacao_assinatura: { status: providerStatus, provider_subscription_id: context.assinatura.provider_subscription_id } },
  }).eq("empresa_id", context.empresaId);
}

async function syncPreapproval(admin: ReturnType<typeof createClient>, resource: Record<string, any>, providerId: string, expectedCollectorId: string, mode: string) {
  const context = await loadContext(admin, resource, providerId, expectedCollectorId, mode);
  if (!context) return;

  const providerStatus = String(resource.status || "").toLowerCase();
  const isCurrentPlan = String(context.assinatura.plano_id) === String(context.planId) && context.activeMatches;
  const dates = {
    periodo_inicio: resource.date_created || new Date().toISOString(),
    periodo_fim: resource.next_payment_date || null,
  };

  if (providerStatus === "authorized") {
    const mergedMetadata = {
      ...context.metadata,
      assinatura_pendente: null,
      assinatura_provider: {
        provider_subscription_id: providerId,
        plano_id: context.planId,
        preco_mensal: context.amount,
        moeda: context.currency,
        ambiente: mode,
        status: providerStatus,
      },
    };
    const { error } = await admin.from("empresa_assinaturas").update({
      plano_id: context.planId,
      status: "ativa",
      provider: "mercado_pago",
      provider_customer_id: resource.payer_id ? String(resource.payer_id) : context.assinatura.provider_customer_id,
      provider_subscription_id: providerId,
      inicio_em: context.assinatura.inicio_em || new Date().toISOString(),
      periodo_inicio: dates.periodo_inicio,
      periodo_fim: dates.periodo_fim,
      cancelada_em: null,
      metadata: mergedMetadata,
    }).eq("empresa_id", context.empresaId);
    if (error) throw error;
    return;
  }

  if (providerStatus === "cancelled" || providerStatus === "paused" || providerStatus === "canceled") {
    if (isCurrentPlan) {
      const mergedMetadata = {
        ...context.metadata,
        assinatura_pendente: null,
        assinatura_provider: {
          ...asObject(context.metadata.assinatura_provider),
          provider_subscription_id: providerId,
          plano_id: context.planId,
          preco_mensal: context.amount,
          moeda: context.currency,
          ambiente: mode,
          status: providerStatus,
        },
      };
      const { error } = await admin.from("empresa_assinaturas").update({
        status: "cancelada",
        cancelada_em: new Date().toISOString(),
        metadata: mergedMetadata,
      }).eq("empresa_id", context.empresaId);
      if (error) throw error;
    } else if (context.pendingMatches) {
      await restorePreviousPending(admin, context, providerStatus);
    }
  }
}

async function syncAuthorizedPayment(admin: ReturnType<typeof createClient>, invoice: Record<string, any>, expectedCollectorId: string, accessToken: string, mode: string) {
  const preapprovalId = String(invoice.preapproval_id || "");
  if (!preapprovalId) return;
  const resource = await providerGet("https://api.mercadopago.com/preapproval/" + encodeURIComponent(preapprovalId), accessToken);
  const context = await loadContext(admin, resource, preapprovalId, expectedCollectorId, mode);
  if (!context) return;

  if (String(invoice.collector_id || expectedCollectorId) !== expectedCollectorId) return;
  if (String(invoice.currency_id || "") !== "BRL" || !amountEqual(invoice.transaction_amount, context.amount)) {
    console.error("Fatura recorrente divergente", { invoiceId: invoice.id, preapprovalId });
    return;
  }

  const invoiceStatus = String(invoice.status || "").toLowerCase();
  if (invoiceStatus === "approved") {
    if (String(resource.status || "").toLowerCase() === "authorized") {
      await syncPreapproval(admin, resource, preapprovalId, expectedCollectorId, mode);
    }
    return;
  }

  if (["rejected", "cancelled", "refunded", "charged_back"].includes(invoiceStatus)) {
    const isCurrentPlan = String(context.assinatura.plano_id) === String(context.planId) && context.activeMatches;
    if (isCurrentPlan) {
      const merged = {
        ...context.metadata,
        assinatura_pendente: null,
        ultima_fatura: { id: String(invoice.id || ""), status: invoiceStatus, recebido_em: new Date().toISOString() },
      };
      const { error } = await admin.from("empresa_assinaturas").update({ status: "inadimplente", metadata: merged }).eq("empresa_id", context.empresaId);
      if (error) throw error;
    } else if (context.pendingMatches) {
      await restorePreviousPending(admin, context, "fatura_" + invoiceStatus);
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response(405, "method not allowed");

  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const dataId = String(url.searchParams.get("data.id") || asObject(body.data).id || "").toLowerCase();
    const topic = String(url.searchParams.get("type") || body.type || body.topic || "").toLowerCase();
    if (topic !== "subscription_preapproval" && topic !== "subscription_authorized_payment") return response(200);

    const secret = Deno.env.get("MERCADO_PAGO_SUBSCRIPTIONS_WEBHOOK_SECRET") || Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") || "";
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
    const expectedCollectorId = Deno.env.get("MERCADO_PAGO_COLLECTOR_ID") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!secret || !accessToken || !expectedCollectorId || !supabaseUrl || !serviceKey) return response(503, "service not configured");
    if (!dataId || !await validSignature(request, dataId, secret)) return response(401, "unauthorized");

    const mode = String(Deno.env.get("MERCADO_PAGO_ENVIRONMENT") || "sandbox").toLowerCase() === "production"
      ? "production" : "sandbox";
    const tokenIsTest = accessToken.startsWith("TEST-");
    if ((mode === "sandbox" && !tokenIsTest) || (mode === "production" && tokenIsTest)) return response(503, "provider environment mismatch");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    if (topic === "subscription_preapproval") {
      const resource = await providerGet("https://api.mercadopago.com/preapproval/" + encodeURIComponent(dataId), accessToken);
      await syncPreapproval(admin, resource, dataId, expectedCollectorId, mode);
      return response(200);
    }

    const invoice = await providerGet("https://api.mercadopago.com/authorized_payments/" + encodeURIComponent(dataId), accessToken);
    if (String(invoice.id || "") !== dataId) return response(200);
    await syncAuthorizedPayment(admin, invoice, expectedCollectorId, accessToken, mode);
    return response(200);
  } catch (error) {
    console.error("Erro no webhook de assinaturas Mercado Pago", error);
    if (error instanceof Error && error.message === "provider_unavailable") return response(502, "provider unavailable");
    return response(500, "internal error");
  }
});
