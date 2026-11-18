-- PedeJá 4.5: gestão administrativa de regiões de entrega.
-- Permite ao administrador consultar e editar áreas de entrega sem abrir escrita direta
-- na tabela protegida por RLS.

begin;

create or replace function public.admin_regiao_salvar(
  p_id uuid default null,
  p_empresa_id text default null,
  p_unidade_id uuid default null,
  p_bairro text default null,
  p_cidade text default null,
  p_uf text default null,
  p_taxa_entrega numeric default 0,
  p_pedido_minimo numeric default 0,
  p_tempo_min integer default 25,
  p_tempo_max integer default 45,
  p_ativo boolean default true
) returns public.empresa_regioes
language plpgsql
security definer
set search_path=''
as $$
declare
  v_reg public.empresa_regioes%rowtype;
  v_minimo numeric;
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  if nullif(trim(coalesce(p_empresa_id,'')),'') is null
     or p_unidade_id is null
     or nullif(trim(coalesce(p_bairro,'')),'') is null
     or nullif(trim(coalesce(p_cidade,'')),'') is null
     or not upper(trim(coalesce(p_uf,''))) ~ '^[A-Z]{2}$' then
    raise exception 'Região incompleta.';
  end if;

  if p_taxa_entrega < 0 or p_pedido_minimo < 0
     or p_tempo_min < 5 or p_tempo_min > 240
     or p_tempo_max < p_tempo_min or p_tempo_max > 300 then
    raise exception 'Valores da região inválidos.';
  end if;

  select e.pedido_minimo
    into v_minimo
  from public.empresas e
  where e.id::text = p_empresa_id
    and e.excluida_em is null
  limit 1;

  if not found then
    raise exception 'Restaurante não encontrado.';
  end if;

  if not exists (
    select 1
    from public.empresa_unidades u
    where u.id = p_unidade_id
      and u.empresa_id::text = p_empresa_id
  ) then
    raise exception 'Unidade não pertence ao restaurante.';
  end if;

  if p_pedido_minimo < coalesce(v_minimo,0) then
    raise exception 'O pedido mínimo da região não pode ser menor que o mínimo geral da loja.';
  end if;

  if p_id is null then
    insert into public.empresa_regioes(
      empresa_id,unidade_id,bairro,cidade,uf,taxa_entrega,pedido_minimo,tempo_min,tempo_max,ativo
    )
    values(
      p_empresa_id,p_unidade_id,trim(p_bairro),trim(p_cidade),upper(trim(p_uf)),
      p_taxa_entrega,p_pedido_minimo,p_tempo_min,p_tempo_max,coalesce(p_ativo,true)
    )
    returning * into v_reg;
  else
    update public.empresa_regioes
    set unidade_id=p_unidade_id,
        bairro=trim(p_bairro),
        cidade=trim(p_cidade),
        uf=upper(trim(p_uf)),
        taxa_entrega=p_taxa_entrega,
        pedido_minimo=p_pedido_minimo,
        tempo_min=p_tempo_min,
        tempo_max=p_tempo_max,
        ativo=coalesce(p_ativo,true),
        updated_at=now()
    where id=p_id
      and empresa_id::text=p_empresa_id
    returning * into v_reg;

    if not found then
      raise exception 'Área de entrega não encontrada.';
    end if;
  end if;

  insert into public.admin_auditoria(admin_id,acao,alvo_id,detalhes)
  values(
    auth.uid(),
    case when p_id is null then 'regiao_criada' else 'regiao_editada' end,
    v_reg.id::text,
    jsonb_build_object(
      'empresa_id',v_reg.empresa_id,
      'unidade_id',v_reg.unidade_id,
      'bairro',v_reg.bairro,
      'cidade',v_reg.cidade,
      'uf',v_reg.uf
    )
  );

  return v_reg;
end;
$$;

revoke all on function public.admin_regiao_salvar(uuid,text,uuid,text,text,text,numeric,numeric,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_regiao_salvar(uuid,text,uuid,text,text,text,numeric,numeric,integer,integer,boolean) to authenticated;

create or replace function public.admin_regiao_status(p_id uuid,p_ativo boolean)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  update public.empresa_regioes
  set ativo=coalesce(p_ativo,false),updated_at=now()
  where id=p_id;

  if not found then
    raise exception 'Área de entrega não encontrada.';
  end if;

  insert into public.admin_auditoria(admin_id,acao,alvo_id,detalhes)
  values(auth.uid(),'regiao_status',p_id::text,jsonb_build_object('ativo',coalesce(p_ativo,false)));

  return true;
end;
$$;

revoke all on function public.admin_regiao_status(uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_regiao_status(uuid,boolean) to authenticated;

create or replace function public.admin_regiao_excluir(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_reg public.empresa_regioes%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  delete from public.empresa_regioes
  where id=p_id
  returning * into v_reg;

  if not found then
    raise exception 'Área de entrega não encontrada.';
  end if;

  insert into public.admin_auditoria(admin_id,acao,alvo_id,detalhes)
  values(auth.uid(),'regiao_excluida',p_id::text,jsonb_build_object(
    'empresa_id',v_reg.empresa_id,
    'unidade_id',v_reg.unidade_id,
    'bairro',v_reg.bairro,
    'cidade',v_reg.cidade,
    'uf',v_reg.uf
  ));

  return true;
end;
$$;

revoke all on function public.admin_regiao_excluir(uuid) from public,anon,authenticated;
grant execute on function public.admin_regiao_excluir(uuid) to authenticated;

commit;
