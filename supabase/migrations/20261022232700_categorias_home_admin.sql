-- Categorias gerenciáveis para os filtros da página inicial do PedeJá.
-- A tabela é separada de public.categorias, usada nas categorias de produtos de cada loja.

begin;

create table if not exists public.categorias_home (
    id uuid primary key default gen_random_uuid(),
    valor text not null,
    nome text not null,
    icone text not null default '🍽️',
    ordem integer not null default 0,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint categorias_home_valor_not_blank check (length(btrim(valor)) between 1 and 80),
    constraint categorias_home_nome_not_blank check (length(btrim(nome)) between 1 and 80),
    constraint categorias_home_icone_not_blank check (length(btrim(icone)) between 1 and 12),
    constraint categorias_home_ordem_nonnegative check (ordem >= 0),
    constraint categorias_home_valor_unique unique (valor)
);

create unique index if not exists categorias_home_valor_normalizado_uidx
    on public.categorias_home (lower(btrim(valor)));

insert into public.categorias_home (valor, nome, icone, ordem, ativo)
values
    ('Hambúrguer', 'Hambúrguer', '🍔', 1, true),
    ('Pizza', 'Pizza', '🍕', 2, true),
    ('Sushi', 'Sushi', '🍣', 3, true),
    ('Brasileira', 'Brasileira', '🍛', 4, true),
    ('Frango', 'Frango', '🍗', 5, true),
    ('Lanches', 'Lanches', '🥪', 6, true),
    ('Doces', 'Sobremesas', '🍰', 7, true),
    ('Bebidas', 'Bebidas', '🥤', 8, true)
on conflict do nothing;

alter table public.categorias_home enable row level security;

revoke all on table public.categorias_home from anon, authenticated;
grant select on table public.categorias_home to anon, authenticated;
grant insert, update, delete on table public.categorias_home to authenticated;
grant all on table public.categorias_home to service_role;

drop policy if exists categorias_home_publicas_ativas on public.categorias_home;
create policy categorias_home_publicas_ativas
    on public.categorias_home
    for select
    to anon, authenticated
    using (ativo = true);

drop policy if exists categorias_home_admin_ler_todas on public.categorias_home;
create policy categorias_home_admin_ler_todas
    on public.categorias_home
    for select
    to authenticated
    using ((select private.admin_tem_permissao('configuracoes')));

drop policy if exists categorias_home_admin_inserir on public.categorias_home;
create policy categorias_home_admin_inserir
    on public.categorias_home
    for insert
    to authenticated
    with check ((select private.admin_tem_permissao('configuracoes')));

drop policy if exists categorias_home_admin_atualizar on public.categorias_home;
create policy categorias_home_admin_atualizar
    on public.categorias_home
    for update
    to authenticated
    using ((select private.admin_tem_permissao('configuracoes')))
    with check ((select private.admin_tem_permissao('configuracoes')));

drop policy if exists categorias_home_admin_excluir on public.categorias_home;
create policy categorias_home_admin_excluir
    on public.categorias_home
    for delete
    to authenticated
    using ((select private.admin_tem_permissao('configuracoes')));

notify pgrst, 'reload schema';
commit;