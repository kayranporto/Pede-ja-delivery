-- PedeJá 4.5: permissões granulares para administradores da plataforma.
-- Administradores antigos continuam com acesso total quando não possuem
-- app_metadata.admin_permissions, preservando compatibilidade.

begin;

create or replace function private.admin_permissoes()
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_permissoes jsonb := auth.jwt() -> 'app_metadata' -> 'admin_permissions';
  v_todas text[] := array[
    'overview',
    'pedidos',
    'financeiro',
    'entregas',
    'areas',
    'restaurantes',
    'usuarios',
    'cupons',
    'marketing',
    'relatorios',
    'suporte',
    'configuracoes',
    'administradores'
  ];
  v_resultado text[];
begin
  if not private.is_admin() then
    return array[]::text[];
  end if;

  if jsonb_typeof(v_permissoes) = 'array' then
    select coalesce(array_agg(distinct valor order by valor), array[]::text[])
      into v_resultado
    from jsonb_array_elements_text(v_permissoes) as item(valor)
    where valor = any(v_todas)
       or valor = 'todas';

    if coalesce(array_length(v_resultado, 1), 0) > 0 then
      if 'todas' = any(v_resultado) then
        return v_todas;
      end if;
      return v_resultado;
    end if;
  end if;

  return v_todas;
end;
$$;

create or replace function private.admin_tem_permissao(p_permissao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
     and p_permissao = any(private.admin_permissoes());
$$;

revoke all on function private.admin_permissoes() from public, anon, authenticated, service_role;
revoke all on function private.admin_tem_permissao(text) from public, anon, authenticated, service_role;

create or replace function public.usuario_tem_permissao_admin(p_permissao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.admin_tem_permissao(p_permissao);
$$;

revoke all on function public.usuario_tem_permissao_admin(text) from public, anon, authenticated, service_role;
grant execute on function public.usuario_tem_permissao_admin(text) to authenticated;

commit;
