"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("home exibe o carrinho principal e mantém o atalho móvel no menu", () => {
  assert.match(html, /id="botaoAbrirCarrinho"/);
  assert.match(html, /<button[^>]+class="mobile-menu-cart"[^>]+id="floatingCart"/);
  assert.doesNotMatch(html, /class="floating-cart"/);
  const botoesCarrinho = html.match(/aria-label="Abrir carrinho"/g) || [];
  assert.equal(botoesCarrinho.length, 1);
});
