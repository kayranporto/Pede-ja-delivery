# Edge Functions — PedeJá 4.0

## Dependências

Cada função possui `deno.json` próprio e usa versão exata das dependências. Não substitua por tags abertas como `@2`.

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

## Assinaturas mensais de restaurantes

Os planos comerciais são cadastrados em `planos_plataforma` e as assinaturas em `empresa_assinaturas`. A Edge Function `iniciar-assinatura` lista os planos apenas para o proprietário autenticado e inicia o checkout de assinatura recorrente do Mercado Pago. O webhook separado `mercado-pago-assinaturas-webhook` confirma eventos consultando o recurso diretamente no provedor, validando assinatura HMAC, restaurante, conta recebedora, ambiente, plano, valor e moeda antes de alterar a assinatura.

A ativação das assinaturas é **bloqueada por padrão** e é independente de `PAYMENT_ONLINE_ENABLED`:
A migration `20261026225301_empresas_sem_comissao.sql` define a taxa financeira de plataforma como 0% para os restaurantes existentes e futuros e adiciona uma restrição de banco para impedir que relatórios voltem a calcular comissão por pedido.


```bash
supabase secrets set MERCADO_PAGO_SUBSCRIPTIONS_ENABLED="false"
supabase secrets set MERCADO_PAGO_ENVIRONMENT="sandbox"
supabase functions deploy iniciar-assinatura
supabase functions deploy mercado-pago-assinaturas-webhook --no-verify-jwt
```

Antes de testar, configure no Supabase os segredos do ambiente sandbox: `MERCADO_PAGO_ACCESS_TOKEN` (token `TEST-`), `MERCADO_PAGO_COLLECTOR_ID`, `MERCADO_PAGO_WEBHOOK_SECRET` (ou `MERCADO_PAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`) e `SITE_URL` com a URL HTTPS publicada do site. Nunca inclua esses valores no repositório nem no frontend.

Depois de configurar, teste criação da assinatura, retorno de checkout, webhook de autorização, fatura aprovada, fatura recusada, cancelamento e eventos duplicados em contas de teste. Só então, após revisão explícita das credenciais de produção e dos testes, habilite:

```bash
supabase secrets set MERCADO_PAGO_SUBSCRIPTIONS_ENABLED="true"
```

Não habilite produção enquanto o modo estiver em sandbox. `MERCADO_PAGO_ENVIRONMENT` e o prefixo do token são conferidos pelo servidor. A alteração do plano só ocorre depois de uma confirmação autorizada do Mercado Pago; o valor efetivamente cobrado e a moeda também são verificados pelo webhook. O cancelamento é solicitado no provedor e o banco aguarda o evento confirmado para atualizar o status.

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
