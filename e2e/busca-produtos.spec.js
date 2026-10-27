"use strict";

const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
    // O teste controla os dados para ser determinístico e não depender do estado do catálogo remoto.
    await page.route("https://**/*", (route) => route.abort());
    await page.addInitScript(() => {
        const empresaBase = [
            { id: "burger-base", nome: "Burger do Vale", categoria: "Hambúrguer", tipo: "Hambúrguer", descricao: "", status: true, taxa_entrega: 4.50, pedido_minimo: 0, tempo_estimado_min: 25, tempo_estimado_max: 40 },
            { id: "sushi-base", nome: "Sushi da Serra", categoria: "Sushi", tipo: "Sushi", descricao: "", status: true, taxa_entrega: 2.50, pedido_minimo: 0, tempo_estimado_min: 30, tempo_estimado_max: 45 }
        ];
        const empresaPizza = {
            id: "pizzaria-central", nome: "Pizzaria Central", categoria: "Pizza", tipo: "Pizzaria", descricao: "Pizzas artesanais",
            status: true, taxa_entrega: 8.50, pedido_minimo: 0, tempo_estimado_min: 25, tempo_estimado_max: 40
        };
        const empresaFechada = {
            id: "pizza-fechada", nome: "Pizza Express", categoria: "Pizza", tipo: "Pizzaria", descricao: "Pizza rápida",
            status: true, taxa_entrega: 2.50, pedido_minimo: 0, tempo_estimado_min: 20, tempo_estimado_max: 35
        };
        const produtosPizza = [
            { id: "produto-pizza-1", empresa_id: empresaPizza.id, nome: "Pizza Marguerita", empresa: empresaPizza },
            { id: "produto-pizza-2", empresa_id: empresaFechada.id, nome: "Pizza Especial", empresa: empresaFechada }
        ];
        window.qaBuscaChamadas = [];
        window.db = {
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                getSession: async () => ({ data: { session: null }, error: null })
            }
        };
        window.DeliveryAPI = {
            async restaurantes() { return empresaBase.map((item) => ({ ...item })); },
            async avaliacoesResumoTodos() { return []; },
            async disponibilidade(empresaId) { return { aberto: String(empresaId) !== "pizza-fechada" }; },
            async cardapio() { return { produtos: [] }; },
            async buscarProdutos(busca, limite) {
                window.qaBuscaChamadas.push({ busca, limite });
                const termo = String(busca || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                return termo === "pizza" ? produtosPizza : [];
            }
        };
    });
});

test("busca por comida combina categoria, status aberto e ordenação por taxa", async ({ page }) => {
    await page.goto("/");
    const mobile = (page.viewportSize()?.width || 1280) <= 700;
    const campoBusca = page.locator(mobile ? "#campoBuscaMobile" : "#campoBusca");

    await expect(campoBusca).toBeVisible();
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(2);

    const todos = page.locator('.categoria[data-categoria=""]');
    await expect(todos).toContainText("Todos");
    await expect(todos).toHaveAttribute("aria-pressed", "true");

    const categoriaSushi = page.locator('.categoria[data-categoria="Sushi"]');
    await categoriaSushi.click();
    await expect(categoriaSushi).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(1);
    await expect(page.locator("#listaRestaurantes")).toContainText("Sushi da Serra");

    await todos.click();
    await expect(todos).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(2);
    await expect(page.locator("#listaRestaurantes")).toContainText("Burger do Vale");
    await expect(page.locator("#listaRestaurantes")).toContainText("Sushi da Serra");

    await campoBusca.fill("pizza");
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(2);
    await expect(page.locator("#listaRestaurantes")).toContainText("Pizzaria Central");
    await expect(page.locator("#listaRestaurantes")).toContainText("Pizza Express");
    await expect(page.locator("#resultadoResumo")).toContainText("2 produtos correspondem à busca nos cardápios.");

    const categoriaPizza = page.locator('.categoria[data-categoria="Pizza"]');
    await categoriaPizza.click();
    await expect(categoriaPizza).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(2);

    await page.locator("#toggleAberto").click();
    await expect(page.locator("#toggleAberto")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(1);
    await expect(page.locator("#listaRestaurantes")).toContainText("Pizzaria Central");
    await expect(page.locator("#listaRestaurantes")).not.toContainText("Pizza Express");

    await page.locator("#toggleAberto").click();
    await expect(page.locator("#listaRestaurantes .card")).toHaveCount(2);
    await page.locator("#ordenarTaxa").click();
    await expect(page.locator("#ordenarTaxa")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listaRestaurantes .card h3").nth(0)).toHaveText("Pizza Express");
    await expect(page.locator("#listaRestaurantes .card h3").nth(1)).toHaveText("Pizzaria Central");

    expect(await page.evaluate(() => window.qaBuscaChamadas)).toEqual([{ busca: "pizza", limite: 30 }]);
});
