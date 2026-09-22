begin;

create or replace function public.empresa_salvar_funcionario(
  p_empresa_id text,
  p_email text,
  p_papel text
)
returns public.empresa_funcionarios
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_identificador text := left(trim(coalesce(p_email, '')), 254);
  v_cpf text;
  v_usuario_id uuid;
  v_usuarios_cpf uuid[];
  v_funcionario public.empresa_funcionarios%rowtype;
begin
  if auth.uid() is null or not private.eh_proprietario_empresa(p_empresa_id) then
    raise exception 'Apenas o proprietário pode gerenciar a equipe.';
  end if;

  if p_papel is null or p_papel not in ('gerente', 'cozinha', 'atendente', 'financeiro') then
    raise exception 'Papel de funcionário inválido.';
  end if;

  if v_identificador = '' then
    raise exception 'Informe o e-mail ou CPF do funcionário.';
  end if;

  if position('@' in v_identificador) > 1 then
    select au.id
      into v_usuario_id
      from auth.users au
     where lower(au.email) = lower(v_identificador)
     limit 1;
  else
    v_cpf := regexp_replace(v_identificador, '\D', '', 'g');

    if length(v_cpf) <> 11 then
      raise exception 'Informe um e-mail válido ou CPF com 11 dígitos.';
    end if;

    select array_agg(u.id order by u.id)
      into v_usuarios_cpf
      from public.usuarios u
      join auth.users au on au.id = u.id
     where regexp_replace(coalesce(u.cpf, ''), '\D', '', 'g') = v_cpf;

    if coalesce(cardinality(v_usuarios_cpf), 0) > 1 then
      raise exception 'CPF associado a mais de uma conta. Use o e-mail do funcionário.';
    end if;

    v_usuario_id := v_usuarios_cpf[1];
  end if;

  if v_usuario_id is null then
    raise exception 'O usuário precisa criar uma conta antes de ser vinculado à equipe.';
  end if;

  if exists (
    select 1
      from public.empresas e
     where e.id::text = p_empresa_id::text
       and e.usuario_id = v_usuario_id
  ) then
    raise exception 'O proprietário já possui acesso total à empresa.';
  end if;

  insert into public.empresa_funcionarios (
    empresa_id, usuario_id, papel, ativo, criado_por, updated_at
  ) values (
    p_empresa_id::text, v_usuario_id, p_papel, true, auth.uid(), now()
  )
  on conflict (empresa_id, usuario_id) do update
    set papel = excluded.papel,
        ativo = true,
        criado_por = auth.uid(),
        updated_at = now()
  returning * into v_funcionario;

  return v_funcionario;
end;
$function$;

revoke all on function public.empresa_salvar_funcionario(text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.empresa_salvar_funcionario(text, text, text)
  to authenticated;

commit;
