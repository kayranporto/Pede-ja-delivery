# Reconciliação do histórico de migrations — GitHub x Supabase

**Projeto:** `wzxsjxdbxonrmlmzufpv` (`site delivery`)  
**Repositório:** `kayranporto/Pede-ja-delivery`, branch `main`  
**Base consultada:** commit `3eb13091149b8740046691e4c11e9bfe781117ef`  
**Auditoria:** 10/11/2026, horário de São Paulo  
**Modo:** consulta somente leitura

## Resumo

- Arquivos SQL em `supabase/migrations`: **70**.
- Registros no histórico remoto de migrations: **70**.
- Tabelas públicas: **43**.
- Colunas públicas: **480**.
- Chaves estrangeiras: **83**.
- Tabelas públicas com RLS habilitada: **43 de 43**.

A igualdade de contagem não significa que o histórico esteja reconciliado. Foram encontrados nove identificadores presentes somente no lado do GitHub e nove somente no histórico remoto. Sete pares têm indícios de renomeação ou mudança de timestamp, mas não foram comprovados por comparação do conteúdo histórico aplicado.

**Não executar `supabase db push` nem reaplicar migrations até que cada par seja reconciliado por conteúdo e efeito no schema.**

## 1. Possíveis correspondências por nome funcional

As correspondências abaixo são candidatas. O nome semelhante não prova que o SQL aplicado é idêntico ao arquivo atual.

| Arquivo no GitHub | Registro remoto candidato | Estado |
|---|---|---|
| `20260923213000_cupom_validacao_server_side_4_5.sql` | `20260924002518 / cupom_validacao_server_side_4_5` | Timestamp diferente |
| `20260925190000_admin_regioes_4_5.sql` | `20260925222056 / admin_regioes_4_5` | Timestamp diferente |
| `20260926193000_admin_permissoes_4_5.sql` | `20260925231435 / admin_permissoes_4_5` | Timestamp diferente |
| `20261027090000_avisos_abertura_restaurante.sql` | `20261027224607 / avisos_abertura_restaurante` | Timestamp diferente |
| `20261022232000_admin_categorias_filtros.sql` | `20261023001630 / 20261022232000_admin_categorias_filtros` | Nome remoto contém o nome do arquivo; timestamp diferente |
| `20261022232100_restringe_execucao_admin_permissoes.sql` | `20261023001853 / 20261022232100_restringe_execucao_admin_permissoes` | Nome remoto contém o nome do arquivo; timestamp diferente |
| `20261022232200_admin_categorias_legacy_permissions.sql` | `20261023003027 / 20261022232200_admin_categorias_legacy_permissions` | Nome remoto contém o nome do arquivo; timestamp diferente |

## 2. Arquivos no GitHub sem versão remota correspondente

| Arquivo | Estado funcional observado |
|---|---|
| `20261021223000_harden_authenticated_variant_catalog.sql` | **Aparentemente não aplicado.** A política remota `catalogo_variantes_authenticated` permite leitura de variantes ativas quando o produto existe, mas não exige `produtos.disponivel = true`. O arquivo GitHub exige essa condição. |
| `20261021235000_require_finance_permission_for_refund_rpc.sql` | **Não aplicado ao estado observado.** A RPC remota `public.admin_preparar_reembolso(uuid)` verifica `private.is_admin()`, mas não verifica a permissão `financeiro`. A função é `SECURITY DEFINER` e `authenticated` possui EXECUTE. |

### Evidência específica — autorização de reembolso

A definição remota de `private.is_admin()` verifica somente se `app_metadata.role = 'admin'`.

A definição remota de `public.admin_preparar_reembolso(uuid)`:
- chama `private.is_admin()`;
- não consulta `app_metadata.admin_permissions`;
- não exige a permissão `financeiro`;
- é `SECURITY DEFINER`;
- permite EXECUTE para `authenticated` e não para `anon`.

A migration do GitHub `20261021235000_require_finance_permission_for_refund_rpc.sql` adiciona a verificação de que `app_metadata.admin_permissions` seja um array contendo `financeiro`.

**Classificação: Crítico.** O controle na Edge Function não substitui a autorização na RPC, pois a função SQL pode ser chamada diretamente por um usuário autenticado com papel de admin. A migration precisa ser aplicada após aprovação e verificação do impacto sobre administradores antigos sem a permissão explícita.

### Evidência específica — variantes de produtos

A política remota `catalogo_variantes_authenticated` não contém a condição `p.disponivel = true`, diferentemente da política `catalogo_variantes_anon` e da migration versionada no GitHub.

**Classificação: Alto.** Usuários autenticados podem obter variantes associadas a produtos indisponíveis, conforme a política atual. A correção versionada deve ser aplicada após confirmar a sequência e os grants/RLS relevantes.

## 3. Versões remotas sem arquivo GitHub correspondente

| Versão remota | Nome registrado | Estado |
|---|---|---|
| `20261022232700` | `categorias_home_admin` | Sem arquivo local com essa versão/nome |
| `20261026225301` | `empresas_sem_comissao` | Sem arquivo local com essa versão/nome |

Esses registros precisam de recuperação do SQL original ou de uma reconstrução auditável a partir do schema e dos objetos atuais. Não criar arquivos retroativos com SQL presumido.

## 4. RLS e privilégios das tabelas sem políticas

O Supabase reportou RLS habilitada, mas sem políticas, em:
- `public.empresa_assinaturas`
- `public.planos_plataforma`

A consulta de grants encontrou privilégios para `postgres` e `service_role`, sem grants para `anon` ou `authenticated`. Isso é compatível com uma estratégia de negar acesso direto pela Data API e operar por RPCs privilegiadas. O alerta do advisor deve permanecer registrado, mas não deve ser tratado isoladamente como exposição confirmada.

## 5. Próximo procedimento seguro

1. Recuperar os SQLs originais ausentes do histórico remoto (`categorias_home_admin` e `empresas_sem_comissao`).
2. Para os sete pares candidatos, comparar o conteúdo local com a origem aplicada ou obter evidência de que o efeito correspondente já existe no schema.
3. Confirmar explicitamente se `20261021223000_harden_authenticated_variant_catalog.sql` foi substituída por outra mudança. A política atual indica que a condição de produto disponível ainda falta.
4. Submeter a migration de autorização financeira para revisão; a RPC atual não valida `financeiro`.
5. Só então construir uma sequência de migrations futura, em timestamps novos e em ordem segura, sem reaproveitar timestamps antigos.
6. Executar testes RLS e de autorização com usuários de teste: admin com `financeiro`, admin sem `financeiro`, usuário autenticado comum e anon.
7. Fazer backup verificado e revisão do plano de reversão antes de qualquer mudança remota.

## 6. Restrições desta auditoria

- Nenhuma migration foi aplicada.
- Nenhuma tabela, política, função ou dado foi alterado.
- Nenhum `db push` foi executado.
- Nenhum segredo ou registro pessoal foi consultado.
- A comparação do SQL histórico realmente aplicado não está disponível apenas pelo histórico de versões; nomes e timestamps são indícios, não prova de equivalência.

## Referências

- [Diretório de migrations](../../supabase/migrations/)
- [Migration de hardening de variantes](../../supabase/migrations/20261021223000_harden_authenticated_variant_catalog.sql)
- [Migration de permissão financeira para reembolso](../../supabase/migrations/20261021235000_require_finance_permission_for_refund_rpc.sql)
- [Testes de prontidão de release](../../tests/release-readiness.test.js)
