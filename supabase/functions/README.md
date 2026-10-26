# Edge Functions — PedeJá 4.0

## Dependências

Cada função possui `deno.json` próprio e usa versão exata das dependências. Não substitua por tags abertas como `@2`.


## Ofertas Relâmpago

A vitrine pública da Home usa a Edge Function `ofertas-relampago`. Ela mostra apenas cupons marcados como relâmpago que estejam ativos, dentro do período de validade, com usos restantes e associados a restaurantes publicados. O card informa o benefício, código, limite restante e horário final; o visitante pode copiar o cupom e abrir o restaurante.

No painel do restaurante, a seção **Promoções e cupons** permite marcar um cupom para destaque, informar um título, uma descrição curta, o limite total de usos e uma data final futura. A funcionalidade reutiliza `public.cupons` em vez de criar um sistema promocional paralelo.

### Implantação

Após revisar e integrar as alterações, aplique as migrations e publique as Edge Functions na ordem abaixo:

```bash
supabase db push
supabase functions deploy api-completa
supabase functions deploy ofertas-relampago
```

A migration `20261026232104_validar_limites_cupom_flash.sql` atualiza o trigger existente `zz_validar_promocao_avancada`: valida situação/validade, limite total, limite por cliente, primeiro pedido e valor mínimo; aplica o desconto no servidor e incrementa o contador de usos dentro da mesma transação. O bloqueio por linha do cupom impede que duas compras simultâneas consumam a última utilização.

Não publique ofertas com código conhecido publicamente se não quiser que ele seja usado fora do card. O checkout sempre revalida validade e limites; a Home é apenas uma vitrine e pode ter cache de até 30 segundos. A função pública de ofertas é somente leitura e não retorna e-mail, telefone ou dados de pedidos.

Antes de ativar em produção, teste em staging: oferta válida, código expirado, cupom pausado, limite total esgotado, limite por usuário, primeiro pedido e dois checkouts simultâneos disputando a última utilização. Se já houver cupons antigos, confira o campo `usos` antes de ativar limites estritos.

## Segredos

A criação de novas cobranças online fica **bloqueada por padrão no servidor**. A variável `PAYMENT_ONLINE_ENABLED` precisa ser exatamente `true` para liberar a Edge Function `criar-pagamento`; se estiver ausente ou diferente, a função responde HTTP 503. Essa trava é independente de `pagamentoOnlineAtivo` no frontend.

Mantenha desativada enquanto os cenários de sandbox e a revisão operacional não estiverem aprovados:

```bash
supabase secrets set PAYMENT_ONLINE_ENABLED="false"
```

Somente depois de aprovar os testes e revisar as credenciais do ambiente correto, habilite-a deliberadamente:

```bash
supabase secrets set PAYMENT_ONLINE_ENABLED="true"
```

A variável libera apenas a criação de novas preferências/cobranças; não desativa o webhook nem o processamento de reembolsos de pagamentos já existentes.

```bash
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="..."
supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET="..."
supabase secrets set MERCADO_PAGO_COLLECTOR_ID="..."
supabase secrets set SITE_URL="https://seu-dominio.example"
supabase secrets set ALLOWED_ORIGINS="https://seu-dominio.example,https://homologacao.example"
```

Push opcional:

```bash
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:privacidade@seu-dominio.example"
supabase secrets set PUSH_WEBHOOK_SECRET="..."
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados pelo ambiente das Edge Functions. A chave de serviço nunca deve sair do backend.

## Publicação

```bash
supabase functions deploy criar-pagamento
supabase functions deploy mercado-pago-webhook --no-verify-jwt
supabase functions deploy processar-reembolso
supabase functions deploy enviar-push --no-verify-jwt
supabase functions deploy api-publica
```

A configuração JWT também está declarada em `supabase/config.toml`.

## API pública

`api-publica` oferece uma API v1 somente de leitura para status, restaurantes publicados e cardápios públicos. O gateway exige a chave publicável no cabeçalho `apikey`; internamente, a função permanece limitada pelas RLS de `anon` e não usa `service_role`.

A especificação OpenAPI é servida em `/functions/v1/api-publica/openapi.json`; exemplos e o smoke remoto estão documentados em [`../../docs/api/README.md`](../../docs/api/README.md). Após a publicação, valide com `API_PUBLICA_URL` definido e execute `npm run test:e2e -- e2e/api.spec.js`.

## Webhook do Mercado Pago

Cadastre o evento de pagamentos em:

```text
https://SEU-PROJETO.supabase.co/functions/v1/mercado-pago-webhook
```

O webhook:

1. valida `x-signature` e `x-request-id`;
2. consulta o pagamento diretamente na API do Mercado Pago;
3. opcionalmente valida o `collector_id` esperado;
4. envia somente dados sanitizados para a RPC;
5. valida referência externa, valor e moeda;
6. processa eventos repetidos de forma idempotente;
7. não rebaixa um pagamento já confirmado por evento antigo;
8. abre reembolso automaticamente quando o pagamento chega após o cancelamento.

## Reembolso

O painel administrativo chama `processar-reembolso`. A função prepara o pedido sob lock, solicita o reembolso integral com chave de idempotência, consulta o pagamento em caso de resposta ambígua e reconcilia o resultado no banco.

Nunca permita que o frontend altere diretamente `pagamento_status` ou marque um reembolso como concluído.

## Push

1. Copie apenas `VAPID_PUBLIC_KEY` para `js/core/config.js`.
2. Crie webhook de `INSERT` em `public.notificacoes` para `enviar-push`.
3. Envie `x-delivery-webhook-secret` com o segredo configurado.
4. Remova inscrições que retornarem 404 ou 410.
