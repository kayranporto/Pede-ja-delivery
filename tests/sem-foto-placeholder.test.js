"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("fallbacks de produto, logo e banner mostram o texto sem foto", () => {
  for (const asset of [
    "assets/produto-padrao.svg",
    "assets/logo-restaurante.svg",
    "assets/banner-padrao.svg"
  ]) {
    assert.match(read(asset), /<title[^>]*>sem foto<\/title>/, asset);
    assert.match(read(asset), />sem foto<\/text>/, asset);
  }
});

test("home mostra sem foto quando a imagem não está disponível", () => {
  const home = read("js/pages/home.js");
  const referenceCss = read("css/pages/home-responsive-reference.css");
  const marketplaceCss = read("css/pages/home-marketplace.css");

  assert.match(home, /placeholder\.textContent = "sem foto"/);
  assert.match(home, /texto\.textContent = "sem foto"/);
  assert.match(home, /image\.addEventListener\("error", mostrarSemFoto/);
  assert.match(referenceCss, /align-items: center !important/);
  assert.match(referenceCss, /justify-content: center !important/);
  assert.match(marketplaceCss, /\.flash-offer-media-placeholder\{background:#f0f1f3\}/);
  assert.match(marketplaceCss, /\.flash-offer-media-placeholder>span\{font-size:14px/);
});

test("a Home e o service worker usam as versões atualizadas dos arquivos", () => {
  const homeHtml = read("index.html");
  const worker = read("sw.js");
  for (const reference of [
    "home-marketplace.css?v=4.4.18",
    "home-responsive-reference.css?v=1.0.2",
    "home.js?v=4.5.7"
  ]) {
    assert.ok(homeHtml.includes(reference), "index.html sem " + reference);
    assert.ok(worker.includes(reference), "sw.js sem " + reference);
  }
});
