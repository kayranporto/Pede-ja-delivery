# Reconciliação de migrations — GitHub × Supabase

**Data da preparação:** 17/11/2026  
**Repositório:** `kayranporto/Pede-ja-delivery`  
**Branch:** `chore/supabase-migration-reconciliation`  
**Base:** `6a5f7cf9a3e5b6fa7197b3ac208f6b20c9dc80ff`  
**Projeto Supabase:** `wzxsjxdbxonrmlmzufpv`  
**Modo desta preparação:** alterações somente no GitHub; Supabase sem alterações.

## Resultado da comparação

A leitura inicial encontrou 70 registros remotos e 71 arquivos locais de migration na base consultada.

- Sete pares com timestamps diferentes foram comparados diretamente entre o SQL do arquivo e `supabase_migrations.schema_migrations.statements`. Os sete conteúdos SQL são equivalentes.
- Os SQLs originais das versões `20261022232700` (`categorias_home_admin`) e `20261026225301` (`empresas_sem_comissao`) foram recuperados do histórico remoto, sem reconstrução presumida.
- A migration local `20261113190000_combos_restaurante.sql` não está registrada no histórico remoto, mas seus objetos foram encontrados no schema. As quatro funções do arquivo foram comparadas com as definições remotas e seus corpos são equivalentes.
- As correções de segurança para a policy autenticada de variantes e para a RPC de preparo de reembolso foram preparadas nesta branch. Elas ainda não foram aplicadas ao Supabase.

## Alterações preparadas nesta branch

1. Sete arquivos de migration foram renomeados para corresponder aos timestamps e nomes registrados no histórico remoto. O conteúdo SQL foi preservado.
2. Dois arquivos históricos foram recuperados exatamente dos comandos armazenados no Supabase.
3. As duas migrations antigas de segurança com timestamps anteriores foram substituídas por migrations novas:
   - `20261118010000_harden_authenticated_variant_catalog.sql`
   - `20261118010100_require_finance_permission_for_refund_rpc.sql`
4. As referências de caminhos nos testes automatizados foram atualizadas.
5. Os testes de prontidão verificam a recuperação dos dois SQLs históricos e a exigência de permissão financeira explícita na RPC.

## Autorização financeira explícita

A consulta de metadados de 17/11/2026 encontrou um administrador em `auth.users` cujo `raw_app_meta_data.admin_permissions` ainda não é um array. A Edge Function `processar-reembolso` já rejeita administradores sem uma lista válida que contenha `financeiro`; a nova migration aplica a mesma regra também na RPC SQL, impedindo que alguém contorne a validação chamando a RPC diretamente.

A migration **não concede** a permissão `financeiro` e não precisa bloquear a implantação por causa de administradores legados. Para um administrador sem a claim, ou com uma lista que não inclua `financeiro`, o reembolso permanece negado. Caso o administrador deva processar reembolsos, a permissão precisa ser atribuída explicitamente pelo fluxo administrativo apropriado e a sessão deve ser renovada para que o JWT reflita a alteração.

## Reconciliação da migration de combos

Depois de revisar a cadeia local e confirmar a correspondência integral dos objetos relevantes, a versão `20261113190000` deve ser marcada como aplicada no histórico remoto, sem reaplicar o SQL:

```bash
supabase migration repair 20261113190000 --status applied
```

Esse comando altera o histórico remoto. Ele não foi executado nesta preparação.

## Contagem esperada após uma futura publicação

- Arquivos locais nesta branch: 73.
- Registros remotos atuais observados: 70.
- Após reconhecer a migration de combos no histórico: 71.
- Após aplicar as duas novas migrations de segurança: 73.

A contagem final é uma expectativa condicionada à revisão, merge e publicação, não o estado atual do projeto remoto.

## Sequência recomendada para publicação

1. Revisar esta branch e executar os testes e verificações do projeto.
2. Fazer backup e confirmar que a restauração é possível.
3. Integrar esta branch à `main` após revisão.
4. Confirmar novamente o histórico remoto e marcar `20261113190000` como aplicada, sem executar seu SQL.
5. Executar `supabase migration list` e `supabase db push --dry-run`; revisar cada migration pendente.
6. Aplicar somente após backup verificável e aprovação explícita; verificar RLS, RPC e testes com contas de administrador com e sem `financeiro`.
7. Atribuir `financeiro` apenas aos administradores que devam processar reembolsos, pelo fluxo administrativo apropriado.

## Estado atual e limites

- Nenhuma migration foi aplicada ao banco remoto.
- Nenhum registro de `supabase_migrations.schema_migrations` foi inserido ou removido.
- Nenhum dado de Auth foi alterado.
- Nenhuma Edge Function foi publicada.
- Nenhuma alteração foi feita diretamente na branch `main`.
- Esta branch foi aberta como Pull Request de rascunho [#86](https://github.com/kayranporto/Pede-ja-delivery/pull/86) e ainda não foi integrada à `main`.

As migrations novas estão versionadas no GitHub, mas só devem ser executadas após revisão, backup verificável e aprovação da publicação.
