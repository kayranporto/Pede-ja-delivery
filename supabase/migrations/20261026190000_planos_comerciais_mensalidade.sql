-- PedeJá: planos comerciais por mensalidade fixa, sem comissão sobre pedidos.
-- Planos idempotentes: empresas existentes permanecem no plano Legado.
-- A cobrança recorrente não é ativada por esta migration; requer integração com gateway.

begin;

-- O plano Legado continua ativo para compatibilidade, mas deixa de ser o padrão
-- para novos restaurantes quando os planos comerciais estiverem cadastrados.
update public.planos_plataforma
set padrao_novos = false, updated_at = now()
where padrao_novos = true;

insert into public.planos_plataforma (
  slug, nome, descricao, ativo, interno, padrao_novos, preco_mensal, moeda,
  trial_dias, limite_unidades, limite_produtos, limite_funcionarios,
  limite_pedidos_mes, recursos, ordem
) values
(
  'basico',
  'Básico',
  'Para restaurantes que estão começando a vender online.',
  true, false, true, 49.90, 'BRL',
  0, 1, 100, 2, 300,
  '{"modelo_cobranca":"mensalidade_fixa","comissao_pedidos_percentual":0,"cardapio_digital":true,"gestao_pedidos":true,"painel_vendas":true,"cupons":false,"destaque_busca":false,"relatorios_avancados":false}'::jsonb,
  10
),
(
  'profissional',
  'Profissional',
  'Para restaurantes que querem crescer com ferramentas promocionais e relatórios.',
  true, false, false, 99.90, 'BRL',
  0, 3, 500, 10, 2000,
  '{"modelo_cobranca":"mensalidade_fixa","comissao_pedidos_percentual":0,"cardapio_digital":true,"gestao_pedidos":true,"painel_vendas":true,"cupons":true,"destaque_busca":true,"relatorios_avancados":true,"campanhas_promocionais":true}'::jsonb,
  20
),
(
  'premium',
  'Premium',
  'Para operações em expansão que precisam de mais capacidade e recursos promocionais.',
  true, false, false, 199.90, 'BRL',
  0, null, null, null, null,
  '{"modelo_cobranca":"mensalidade_fixa","comissao_pedidos_percentual":0,"cardapio_digital":true,"gestao_pedidos":true,"painel_vendas":true,"cupons":true,"destaque_busca":true,"relatorios_avancados":true,"campanhas_promocionais":true,"multiunidade":true,"suporte_prioritario":true}'::jsonb,
  30
)
on conflict (slug) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  interno = false,
  padrao_novos = excluded.padrao_novos,
  preco_mensal = excluded.preco_mensal,
  moeda = excluded.moeda,
  trial_dias = excluded.trial_dias,
  limite_unidades = excluded.limite_unidades,
  limite_produtos = excluded.limite_produtos,
  limite_funcionarios = excluded.limite_funcionarios,
  limite_pedidos_mes = excluded.limite_pedidos_mes,
  recursos = excluded.recursos,
  ordem = excluded.ordem,
  updated_at = now();

-- Mantém a garantia de exatamente um plano padrão e corrige possíveis estados
-- antigos sem alterar as assinaturas já atribuídas aos restaurantes existentes.
update public.planos_plataforma
set padrao_novos = (slug = 'basico'), updated_at = now()
where slug in ('legado', 'basico', 'profissional', 'premium');

commit;
