"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => {
  const direct = path.join(root, file);
  return fs.readFileSync(fs.existsSync(direct) ? direct : path.join(root, "html", file), "utf8");
};

test("painel do entregador mantém estados hidden no HTML", () => {
  const html = read("entregador.html");
  assert.match(html, /class="driver-loading" id="entregadorLoading"/);
  for (const selector of [
    /class="pending-card" id="entregadorPendente"[^>]*\bhidden\b/,
    /id="entregadorApp"[^>]*\bhidden\b/,
    /id="cadastroEntregador"[^>]*\bhidden\b/
  ]) assert.match(html, selector);
  assert.match(read("js/pages/entregador.js"), /\.hidden\s*=\s*(true|false)/);
});

test("fluxo do entregador encerra o loading antes de decidir o estado da conta", () => {
  const js = read("js/pages/entregador.js");
  const esconder = js.indexOf("loading.hidden = true");
  const erro = js.indexOf("if (error)", esconder);
  const semCadastro = js.indexOf("if (!data)", esconder);
  const pendente = js.indexOf("if (!data.aprovado)", esconder);
  assert.ok(esconder >= 0, "loading não é encerrado");
  assert.ok(erro > esconder && semCadastro > esconder && pendente > esconder, "loading deve encerrar antes dos estados finais");
});

test("entregador força a versão corrigida do enhancements", () => {
  const html = read("entregador.html");
  assert.match(html, /css\/core\/enhancements\.css\?v=4\.4\.6/);
});
