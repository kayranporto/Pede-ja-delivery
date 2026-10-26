"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20261026235000_ofertas_relampago.sql");
const edge = read("supabase/functions/ofertas-relampago/index.ts");
const api = read("supabase/functions/api-completa/index.ts");
const home = read("index.html");
const homeScript = read("js/pages/home.js");
const homeCss = read("css/pages/home-marketplace.css");
const restaurantHtml = read("html/empresa-dashboard.html");
const restaurantScript = read("js/pages/empresa-dashboard.js");
const config = read("supabase/config.toml");
const sw = read("sw.js");

test("ofertas relâmpago reutilizam cupons e exigem validade e quantidade", () => {
  assert.ok(migration.includes("add column if not exists relampago"));
  assert.ok(migration.includes("add column if not exists titulo_relampago"));
  assert.ok(migration.includes("limite_usos is not null"));
  assert.ok(migration.includes("fim is not null"));
  assert.ok(migration.includes("fim > inicio"));
  assert.ok(migration.includes("cupons_relampago_vitrine_idx"));
  assert.ok(api.includes("titulo_relampago"));
  assert.ok(api.includes("Number.isInteger(limiteUsos)"));
  assert.ok(api.includes("fimDate.getTime() <= Date.now()"));
});

test("API pública retorna apenas ofertas válidas e restaurantes publicados", () => {
  assert.ok(edge.includes('.eq("relampago", true)'));
  assert.ok(edge.includes('.eq("ativo", true)'));
  assert.ok(edge.includes('.lte("inicio", now)'));
  assert.ok(edge.includes('.gt("fim", now)'));
  assert.ok(edge.includes("limit > used"));
  assert.ok(edge.includes('.eq("publicado", true)'));
  assert.ok(edge.includes('.is("excluida_em", null)'));
  assert.ok(edge.includes("usos_restantes"));
  assert.ok(edge.includes("https://kayranporto.github.io"));
  assert.doesNotMatch(edge, /empresa\.email|empresa\.telefone|cnpj/);
});

test("Home mostra as ofertas, validade, usos restantes e permite copiar o cupom", () => {
  assert.ok(home.includes('id="ofertasRelampagoSection"'));
  assert.ok(home.includes('id="listaOfertasRelampago"'));
  assert.ok(homeScript.includes('functions.invoke("ofertas-relampago"'));
  assert.ok(homeScript.includes("usos_restantes"));
  assert.ok(homeScript.includes("copiarCodigoOfertaRelampago"));
  assert.ok(homeScript.includes("html/restaurante.html?id="));
  assert.ok(homeCss.includes(".flash-offer-card"));
  assert.ok(homeCss.includes("@media(max-width:620px)"));
  assert.ok(sw.includes("./css/pages/home-marketplace.css?v=4.4.17"));
  assert.ok(sw.includes("./js/pages/home.js?v=4.5.5"));
});

test("restaurante publica a oferta usando o endpoint de cupons existente", () => {
  assert.ok(restaurantHtml.includes('id="cupomRelampago"'));
  assert.ok(restaurantHtml.includes('id="cupomTituloRelampago"'));
  assert.ok(restaurantHtml.includes('id="cupomDescricaoRelampago"'));
  assert.ok(restaurantScript.includes("relampago,"));
  assert.ok(restaurantScript.includes("titulo_relampago: relampago ? tituloRelampago : null"));
  assert.ok(restaurantScript.includes("sincronizarCamposCupomRelampago"));
  assert.ok(restaurantScript.includes("flash-coupon-badge"));
  assert.ok(restaurantHtml.includes("empresa-dashboard.js?v=4.4.11"));
  assert.ok(restaurantHtml.includes("empresa-dashboard.css?v=4.5.3"));
});

test("endpoint público de ofertas é sem JWT apenas para leitura", () => {
  assert.match(config, /\[functions\.ofertas-relampago\]\s+verify_jwt = false/);
  assert.ok(edge.includes('request.method !== "GET" && request.method !== "POST"'));
  assert.ok(!edge.includes('.insert('));
  assert.ok(!edge.includes('.update('));
  assert.ok(!edge.includes('.delete('));
});
