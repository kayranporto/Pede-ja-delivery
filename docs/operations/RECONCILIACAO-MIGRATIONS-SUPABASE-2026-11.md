# Reconciliação de migrations — GitHub × Supabase

**Preparação:** 17/11/2026  
**Última verificação:** 17/11/2026  
**Repositório:** `kayranporto/Pede-ja-delivery`  
**PR de reconciliação:** [#86](https://github.com/kayranporto/Pede-ja-delivery/pull/86) — integrada à `main`  
**Commit integrado:** `920d8c7ede13d98dc23037a56fe9eb048a656011`  
**Projeto Supabase:** `wzxsjxdbxonrmlmzufpv`  
**Estado atual:** histórico reconciliado, migrations alinhadas e permissões Auth atualizadas para um administrador; backup externo restaurável ainda não foi comprovado.

## Resultado inicial e resultado final

A primeira leitura encontrou divergência entre arquivos locais e histórico remoto. Após a reconciliação e integração da PR #86, a verificação cruzada confirmou:

- **73 arquivos** SQL em `supabase/migrations`.
- **73 registros** em `supabase_migrations.schema_migrations`.
- **Zero versões ausentes no GitHub** e **zero versões ausentes no Supabase**.
- Primeira versão: `20260801000100`.
- Última versão: `20261118010100`.

Sete pares com timestamps diferentes foram comparados diretamente entre o SQL dos arquivos e as declarações armazenadas em `supabase_migrations.schema_migrations.statements`; os conteúdos eram equivalentes. Dois SQLs históricos (`20261022232700` e `20261026225301`) foram recuperados do histórico remoto, sem reconstrução presumida.

A migration `20261113190000_combos_restaurante.sql` e as duas migrations de segurança `20261118010000` e `20261118010100` agora constam no histórico remoto. **Não execute novamente o SQL de combos e não rode `migration repair` para essa versão.**

## Alterações integradas pela PR #86

1. Sete arquivos de migration foram renomeados para corresponder aos timestamps registrados no Supabase, preservando o SQL.
2. Dois arquivos históricos foram recuperados exatamente do histórico remoto.
3. Duas migrations de segurança foram organizadas em timestamps novos:
   - `20261118010000_harden_authenticated_variant_catalog.sql`
   - `20261118010100_require_finance_permission_for_refund_rpc.sql`
4. Testes, caminhos de referência e documentação foram atualizados.
5. A RPC SQL de preparação de reembolso exige a permissão `financeiro` explícita, em linha com a validação da Edge Function.

## Autorização financeira explícita

A consulta de metadados de 17/11/2026 encontrou um único administrador cuja lista `raw_app_meta_data.admin_permissions` não estava em formato de array. Após autorização expressa, a lista foi atualizada para os 14 identificadores administrativos reconhecidos pelo projeto, incluindo `financeiro`; as demais permissões foram preservadas e nenhum outro usuário foi alterado.

A verificação posterior confirmou um administrador com 14 permissões explícitas e `financeiro` presente. A sessão/JWT existente pode continuar com claims antigas até ser renovada. O administrador deve sair e entrar novamente ou renovar a sessão antes de testar a operação financeira.

## Validação após a integração

O commit integrado é o HEAD da branch `main`. Os quatro checks do commit terminaram com sucesso:

- `verify`
- `chromium`
- `deploy`
- `Supabase Preview`

O status de deploy do Vercel também foi concluído com sucesso. Esses resultados comprovam os checks automatizados executados no commit; não substituem backup nem a revisão contínua dos alertas de segurança.

## Alertas de segurança ainda em acompanhamento

### Tabelas com RLS e sem policies

As tabelas `public.empresa_assinaturas` e `public.planos_plataforma` têm RLS habilitada e nenhuma policy. A consulta de privilégios confirmou que `anon` e `authenticated` não têm acesso direto de leitura; somente `postgres` e `service_role` têm esse privilégio. Não crie policies genéricas apenas para eliminar o aviso do Advisor.

### Funções SECURITY DEFINER

O Advisor identifica cinco funções acessíveis a `anon`: `calcular_entrega_empresa`, `calcular_entrega_unidade`, `empresa_disponibilidade`, `empresa_disponibilidade_unidade` e `empresa_unidades_publicas`. A revisão das definições mostrou que elas calculam entrega ou retornam disponibilidade/dados públicos de empresas publicadas e ativas. A exposição deve continuar intencional e limitada a esses dados públicos.

O Advisor também identifica 70 funções acessíveis a `authenticated`. A consulta catalogal confirmou `search_path` fixado nas 78 funções `SECURITY DEFINER` do schema `public`. A amostra de funções que não continham verificações diretas de `auth.uid()`/JWT mostrou verificações administrativas por `private.is_admin()`, funções de catálogo público e uma função de runtime sem execução para `anon` ou `authenticated`. Não revogue grants em massa: cada RPC precisa ser analisada com seus chamadores e regras de autorização antes de qualquer alteração.

### Extensão pg_net

A extensão `pg_net` está na versão `0.20.4`, registrada no schema `public`, e não é relocatable (`extrelocatable = false`). A documentação do Supabase orienta recriá-la no schema `extensions`, em vez de tentar `ALTER EXTENSION ... SET SCHEMA`. A consulta encontrou um consumidor ativo: `private.encaminhar_push_notificacao()` chama `net.http_post` e é acionada pelo trigger `notificacoes_web_push` (`AFTER INSERT` em `public.notificacoes`). A recriação pode interromper esse fluxo e outros consumidores de `net.http_*`; portanto, não foi feita nesta auditoria. Só planeje essa mudança após mapear todos os consumidores e validar backup/restauração.

### Proteção de senhas vazadas

O Security Advisor ainda informa que a proteção contra senhas vazadas está desativada. A organização do projeto foi verificada no plano **Free**; a documentação atual do Supabase informa que essa proteção está disponível apenas nos planos Pro e superiores. No plano atual, revise no painel Auth as opções disponíveis de comprimento mínimo (não menos que 8 caracteres) e exigência de combinação de tipos de caracteres. Não tente ativar o recurso por migration SQL.

## Performance: itens sem alteração

- Sete índices aparecem como não utilizados. Não os remova sem período adequado de observação e análise das consultas reais.
- O Advisor identifica 17 casos de múltiplas policies permissivas de SELECT. A consolidação só deve ocorrer após comparar os predicados, papéis e efeitos de cada policy.
- Nenhum índice ou policy foi removido ou alterado nesta etapa.

## Backup e recuperação

A organização está no plano **Free**. A documentação do Supabase recomenda exportações regulares com `supabase db dump` e cópias externas para esse plano; backups automáticos diários estão disponíveis nos planos Pro, Team e Enterprise. A sessão conectada não dispõe de CLI/Docker nem acesso ao terminal local para produzir ou validar os arquivos. O backup **ainda não foi executado**.

Foi revisado e endurecido o fluxo existente em `scripts/backup-supabase.ps1` e `scripts/restore-supabase.ps1`:

- a senha é consumida por `SUPABASE_DB_PASSWORD` durante o comando de link e não é passada como argumento na linha de comando;
- o script verifica a disponibilidade do Docker e usa a versão fixada do Supabase CLI;
- gera `roles.sql`, `schema.sql` e `data.sql` fora do clone Git, na pasta `$HOME\Backups\PedeJa`;
- cria `manifest.json` com projeto de origem, horário UTC, versão do CLI, tamanho e SHA-256 de cada arquivo;
- o script de restauração exige caminho absoluto, projeto temporário diferente do projeto de origem, Session Pooler e confirmação explícita; valida manifesto, tamanho e hashes antes de executar SQL;
- a restauração executa em transação única e faz smoke tests de tabelas, policies e funções públicas.

**Limitação do dump:** a CLI do Supabase exclui os schemas gerenciados `auth` e `storage`, além dos schemas pertencentes a extensões. Portanto, esse conjunto não contém os usuários do Auth, dados/objetos de Storage, nem Edge Functions, segredos ou configuração de provedores Auth. Ele é um **backup lógico parcial do banco**, não um backup completo do projeto. Os objetos armazenados via Storage API também precisam de exportação independente. O manifesto e os avisos dos scripts registram esse limite.

Procedimento para executar no Windows, a partir da raiz do clone:

```powershell
npx --yes supabase@2.115.0 login
$env:SUPABASE_DB_PASSWORD = Read-Host "Senha do banco Supabase"
npm run backup:supabase
Remove-Item Env:SUPABASE_DB_PASSWORD
```

O resultado é gravado em `$HOME\Backups\PedeJa\<project-ref>-<timestamp>\`. Copie essa pasta para armazenamento seguro fora do computador/clone. Antes de qualquer alteração de schema ou dados em produção, restaure esse dump em um projeto isolado e registre os resultados. Para a recuperação integral, complemente o backup com Auth, Storage, Edge Functions, segredos e configuração externa.

**Status:** backup não executado; restauração não testada. Nenhum arquivo de backup real foi criado por esta auditoria.

## Estado e limites

- Reconciliação de migrations: **concluída**; 73/73 versões correspondentes entre GitHub e Supabase.
- PR #86: integrada à `main` no commit `920d8c7ede13d98dc23037a56fe9eb048a656011`.
- Migrations de combos e as duas migrations de segurança: presentes no histórico remoto.
- Permissão `financeiro`: concedida ao único administrador após autorização expressa; renovar a sessão para atualizar as claims.
- Checks `verify`, `chromium`, `deploy` e `Supabase Preview`: sucesso.
- Backup externo restaurável: **pendente**; ainda não executado nem testado.
- Proteção contra senhas vazadas: **pendente por limitação do plano Free**.
- Remanejamento de `pg_net` e otimizações de policies/índices: **não executados**, dependem de análise e backup adequados.
- Nenhuma Edge Function foi publicada por esta etapa.
