"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const edge = read("supabase/functions/geocodificar-endereco/index.ts");

test("geocodificação exige POST e responde a preflight", () => {
  assert.match(edge, /request\.method === "OPTIONS"/);
  assert.match(edge, /request\.method !== "POST"[^\n]*405/);
});

test("geocodificação valida endereço brasileiro antes de consultar o provedor", () => {
  assert.match(edge, /\^\\d\{5\}-\?\\d\{3\}\$/);
  assert.match(edge, /logradouro\.length >= 2/);
  assert.match(edge, /numero\.length >= 1/);
  assert.match(edge, /cidade\.length >= 2/);
  assert.match(edge, /\^\[A-Z\]\{2\}\$/);
  assert.ok(edge.indexOf("enderecoValido(endereco)") < edge.indexOf("fetch(url"));
});

test("geocodificação limita chamadas e define timeout do provedor", () => {
  assert.match(edge, /proximaConsultaPermitidaEm/);
  assert.match(edge, /inicio \+ 1100/);
  assert.match(edge, /setTimeout\(\(\) => controller\.abort\(\), 8000\)/);
  assert.match(edge, /clearTimeout\(timeout\)/);
});

test("geocodificação consulta apenas resultados brasileiros e valida coordenadas", () => {
  assert.match(edge, /countrycodes", "br"/);
  assert.match(edge, /format", "jsonv2"/);
  assert.match(edge, /latitude < -90 \|\| latitude > 90/);
  assert.match(edge, /longitude < -180 \|\| longitude > 180/);
  assert.match(edge, /OpenStreetMap Nominatim/);
  assert.match(edge, /© OpenStreetMap contributors/);
});

test("geocodificação usa somente o helper compartilhado e não contém credenciais", () => {
  assert.match(edge, /from "\.\.\/\_shared\/cors\.ts"/);
  assert.doesNotMatch(edge, /SUPABASE_SERVICE_ROLE_KEY|MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET/);
  const config = JSON.parse(read("supabase/functions/geocodificar-endereco/deno.json"));
  assert.equal(config.compilerOptions.strict, true);
});
