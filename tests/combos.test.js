"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("painel permite criar, editar e pausar combos a partir de produtos da unidade", () => {
    const html = read("html/empresa-dashboard.html");
    const dashboard = read("js/pages/empresa-dashboard.js");
    const api = read("supabase/functions/api-completa/index.ts");

    for (const id of ["comboForm", "comboProduto", "comboQuantidade", "comboItensSelecionados", "combosEmpresa"]) {
        assert.match(html, new RegExp(`id="${id}"`));
    }
    assert.match(dashboard, /acao: "combo_salvar"/);
    assert.match(dashboard, /produtosElegiveisParaCombo/);
    assert.match(dashboard, /acao: "produto_disponibilidade"/);
    assert.match(api, /if \(acao === "combo_salvar"\)/);
    assert.match(api, /\.eq\("unidade_id", unidadeId\)/);
    assert.match(api, /produto_variantes/);
    assert.match(api, /produto_grupos/);
});

test("combos são itens de cardápio com composição e preço promocional próprios", () => {
    const api = read("supabase/functions/api-completa/index.ts");
    const restaurant = read("js/pages/restaurante.js");

    assert.match(api, /`Combo: \$\{comboItems\.map/);
    assert.match(api, /is_combo: true/);
    assert.match(api, /combo_itens: comboItems/);
    assert.match(api, /nome: "Combos"/);
    assert.match(restaurant, /produto\.descricao/);
});

test("Home exibe combos ativos de restaurantes publicados e leva ao cardápio", () => {
    const html = read("index.html");
    const home = read("js/pages/home.js");
    const client = read("js/core/supabase.js");
    const api = read("supabase/functions/api-completa/index.ts");
    const serviceWorker = read("sw.js");

    assert.match(html, /id="combosDestaqueSection"[^>]*hidden/);
    assert.match(html, /id="listaCombosDestaque"/);
    assert.match(home, /DeliveryAPI\.combosDestaque\(8\)/);
    assert.match(home, /className = "produto-destaque combo-produto-destaque"/);
    assert.match(home, /empresa_nome \|\| "Restaurante"/);
    assert.match(client, /tipo: "combos"/);
    assert.match(html, /supabase\.js\?v=4\.4\.10/);
    assert.match(api, /async function publicComboHighlights/);
    assert.match(api, /\.eq\("is_combo", true\)/);
    assert.match(api, /\.eq\("disponivel", true\)/);
    assert.match(api, /\.eq\("status", true\)/);
    assert.match(serviceWorker, /home-marketplace\.css\?v=4\.4\.20/);
    assert.match(serviceWorker, /home\.js\?v=4\.5\.9/);
});

test("pedido salva a composição do combo, reserva estoque dos componentes e devolve no cancelamento", () => {
    const migration = read("supabase/migrations/20261113190000_combos_restaurante.sql");
    const checkout = read("supabase/migrations/20260801001600_operacao_catalogo_e_escala.sql");
    const dashboard = read("js/pages/empresa-dashboard.js");
    const orders = read("js/pages/meus-pedidos.js");

    assert.match(migration, /add column if not exists combo_itens jsonb/);
    assert.match(migration, /private\.validar_combo_produto/);
    assert.match(migration, /private\.reservar_estoque_item/);
    assert.match(migration, /new\.combo_itens := v_componentes/);
    assert.match(migration, /private\.restaurar_estoque_cancelamento/);
    assert.match(checkout, /insert into public\.pedido_itens/);
    assert.match(dashboard, /Combo: \$\{item\.combo_itens\.map/);
    assert.match(orders, /item\.combo_itens\.map/);
});
