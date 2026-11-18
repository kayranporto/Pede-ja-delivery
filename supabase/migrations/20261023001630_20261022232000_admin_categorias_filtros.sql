-- Categorias globais editáveis para os filtros da Home.
-- A lista é pública para leitura, mas somente administradores autorizados podem alterá-la.
begin;
create table if not exists public.categorias_filtros_home (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  icone text not null default '🍽️' check (char_length(icone) between 1 and 12),
  ordem integer not null default 0 check (ordem >= 0),
  aliases text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists categorias_filtros_home_nome_unico
  on public.categorias_filtros_home (lower(btrim(nome)));
alter table public.categorias_filtros_home enable row level security;
revoke all on table public.categorias_filtros_home from public, anon, authenticated;
grant select on table public.categorias_filtros_home to anon, authenticated;
grant insert, update, delete on table public.categorias_filtros_home to authenticated;
drop policy if exists "categorias filtros leitura publica" on public.categorias_filtros_home;
create policy "categorias filtros leitura publica"
on public.categorias_filtros_home for select to anon, authenticated using (true);
drop policy if exists "admin gerencia filtros categorias inserir" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias inserir" on public.categorias_filtros_home
for insert to authenticated with check ((select public.usuario_tem_permissao_admin('categorias_filtros')));
drop policy if exists "admin gerencia filtros categorias atualizar" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias atualizar" on public.categorias_filtros_home
for update to authenticated
using ((select public.usuario_tem_permissao_admin('categorias_filtros')))
with check ((select public.usuario_tem_permissao_admin('categorias_filtros')));
drop policy if exists "admin gerencia filtros categorias excluir" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias excluir" on public.categorias_filtros_home
for delete to authenticated using ((select public.usuario_tem_permissao_admin('categorias_filtros')));
create or replace function private.admin_permissoes()
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare
  v_permissoes jsonb := auth.jwt() -> 'app_metadata' -> 'admin_permissions';
  v_todas text[] := array[
    'overview', 'pedidos', 'financeiro', 'entregas', 'areas', 'restaurantes',
    'usuarios', 'cupons', 'marketing', 'relatorios', 'suporte', 'configuracoes',
    'administradores', 'categorias_filtros'
  ];
  v_resultado text[];
begin
  if not private.is_admin() then return array[]::text[]; end if;
  if jsonb_typeof(v_permissoes) = 'array' then
    select coalesce(array_agg(distinct valor order by valor), array[]::text[])
      into v_resultado
    from jsonb_array_elements_text(v_permissoes) as item(valor)
    where valor = any(v_todas) or valor = 'todas';
    if coalesce(array_length(v_resultado, 1), 0) > 0 then
      if 'todas' = any(v_resultado) then return v_todas; end if;
      return v_resultado;
    end if;
  end if;
  return v_todas;
end;
$$;
revoke all on function private.admin_permissoes() from public, anon, authenticated, service_role;
grant execute on function private.admin_permissoes() to authenticated;
insert into public.categorias_filtros_home (nome, icone, ordem, aliases)
values
  ('Hambúrguer', '🍔', 10, array['Hamburger', 'Hamburgueria']::text[]),
  ('Pizza', '🍕', 20, array[]::text[]),
  ('Sushi', '🍣', 30, array[]::text[]),
  ('Brasileira', '🍛', 40, array[]::text[]),
  ('Frango', '🍗', 50, array[]::text[]),
  ('Lanches', '🥪', 60, array[]::text[]),
  ('Doces', '🍰', 70, array['Sobremesas', 'Doces e sobremesas']::text[]),
  ('Bebidas', '🥤', 80, array[]::text[])
on conflict do nothing;
notify pgrst, 'reload schema';
commit;
