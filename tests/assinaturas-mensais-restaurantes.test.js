"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const page = read("html/empresa-dashboard.html");
const pageScript = read("js/pages/empresa-dashboard.js");
const pageCss = read("css/pages/empresa-dashboard.css");
const startSubscription = read("supabase/functions/iniciar-assinatura/index.ts");
const webhook = read("supabase/functions/mercado-pago-assinaturas-webhook/index.ts");
const config = read("supabase/config.toml");
const edgeTsconfig = read("tsconfig.edge.json");
const migration = read("supabase/migrations/20261026223732_planos_comerciais_mensalidade.sql");

test("painel do restaurante disponibiliza planos e informa mensalidade sem comissão", () => {
  assert.match(page, /href="#plano"/);
  assert.match(page, /id="planosRestauranteGrid"/);
  assert.match(page, /0% de comissão/);
  assert.match(pageScript, /functions\.invoke\("iniciar-assinatura"/);
  assert.match(pageScript, /cancelarAssinaturaRestaurante/);
  assert.match(pageCss, /\.restaurant-plans-grid/);
  assert.doesNotMatch(pageScript, /MERCADO_PAGO_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
});

test("checkout recorrente exige proprietário autenticado e gate de servidor", () => {
  assert.match(startSubscription, /auth\.getUser\(\)/);
  assert.match(startSubscription, /\.eq\("usuario_id", user\.id\)/);
  assert.match(startSubscription, /MERCADO_PAGO_SUBSCRIPTIONS_ENABLED/);
  assert.match(startSubscription, /action === "cancelar"/);
  assert.match(startSubscription, /frequency_type: "months"/);
  assert.match(startSubscription, /transaction_amount: amount/);
  assert.match(startSubscription, /currency_id: "BRL"/);
  assert.match(startSubscription, /X-Idempotency-Key/);
  assert.match(startSubscription, /preapproval/);
});

test("webhook de assinatura confirma origem, assinatura, valor e moeda antes de atualizar", () => {
  assert.match(webhook, /validSignature\(request, dataId, secret\)/);
  assert.match(webhook, /subscription_preapproval/);
  assert.match(webhook, /subscription_authorized_payment/);
  assert.match(webhook, /expectedCollectorId/);
  assert.match(webhook, /amountEqual/);
  assert.match(webhook, /external_reference/);
  assert.match(webhook, /status: "inadimplente"/);
  assert.match(webhook, /status: "cancelada"/);
});

test("configuração mantém checkout com JWT e webhook sem JWT, mas assinado", () => {
  assert.match(config, /\[functions\.iniciar-assinatura\]\s+verify_jwt = true/);
  assert.match(config, /\[functions\.mercado-pago-assinaturas-webhook\]\s+verify_jwt = false/);
  assert.match(edgeTsconfig, /supabase\/functions\/iniciar-assinatura\/index\.ts/);
  assert.match(edgeTsconfig, /supabase\/functions\/mercado-pago-assinaturas-webhook\/index\.ts/);
  assert.match(migration, /"comissao_pedidos_percentual":0/);
});
