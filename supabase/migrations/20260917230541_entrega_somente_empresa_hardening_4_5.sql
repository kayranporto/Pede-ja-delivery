-- Multi Delivery 4.5: endurecimento da logística exclusivamente empresarial.
-- Não existe frota global da plataforma. Todo entregador operacional
-- precisa estar vinculado a uma unidade/empresa.

begin;

alter table public.empresa_unidades
  alter column entrega_modalidade set default 'propria';

update public.empresa_unidades
set entrega_modalidade = 'propria',
    updated_at = now()
where entrega_modalidade is distinct from 'propria';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'empresa_unidades_entrega_modalidade_check'
      and conrelid = 'public.empresa_unidades'::regclass
  ) then
    alter table public.empresa_unidades
      drop constraint empresa_unidades_entrega_modalidade_check;
  end if;

  alter table public.empresa_unidades
    add constraint empresa_unidades_entrega_modalidade_check
    check (entrega_modalidade = 'propria');
end $$;

create or replace function public.empresa_unidade_configurar_entrega(
  p_unidade_id uuid,
  p_modalidade text,
  p_fallback_minutos integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unidade record;
  v_total_ativos integer;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if p_modalidade is distinct from 'propria' then
    raise exception 'Esta plataforma opera somente com entregadores próprios da empresa.';
  end if;

  select u.id,u.empresa_id,u.nome
  into v_unidade
  from public.empresa_unidades u
  join public.empresas e on e.id::text = u.empresa_id::text
  where u.id = p_unidade_id
    and e.usuario_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Unidade não encontrada ou acesso negado.';
  end if;

  update public.empresa_unidades
  set entrega_modalidade = 'propria',
      entrega_hibrida_fallback_minutos = greatest(1, least(coalesce(p_fallback_minutos, 5), 60)),
      updated_at = now()
  where id = p_unidade_id;

  select count(*)::integer into v_total_ativos
  from public.empresa_entregadores v
  join public.entregadores d on d.id = v.entregador_id
  where v.unidade_id = p_unidade_id
    and v.empresa_id::text = v_unidade.empresa_id::text
    and v.ativo = true
    and d.aprovado = true;

  perform private.redistribuir_entregas_pendentes(100);

  return jsonb_build_object(
    'unidade_id', p_unidade_id,
    'unidade_nome', v_unidade.nome,
    'modalidade', 'propria',
    'fallback_minutos', greatest(1, least(coalesce(p_fallback_minutos, 5), 60)),
    'entregadores_ativos', v_total_ativos
  );
end;
$$;

create or replace function public.entregador_definir_online(p_online boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atualizado boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if p_online and not exists (
    select 1
    from public.empresa_entregadores v
    join public.empresa_unidades u on u.id = v.unidade_id
    where v.entregador_id = auth.uid()
      and v.ativo = true
      and u.ativa = true
      and u.entrega_modalidade = 'propria'
  ) then
    raise exception 'Você precisa estar vinculado a uma empresa com entrega própria para ficar online.';
  end if;

  update public.entregadores
  set online = p_online,
      updated_at = now()
  where id = auth.uid()
    and aprovado = true;

  v_atualizado := found;

  if v_atualizado and p_online then
    perform private.redistribuir_entregas_pendentes(100);
  end if;

  return v_atualizado;
end;
$$;

create or replace function public.listar_entregas_disponiveis()
returns table(
  pedido_id uuid,
  numero bigint,
  restaurante text,
  bairro text,
  total numeric,
  pagamento text,
  agendado_para timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.numero,
    p.empresa_nome,
    coalesce((regexp_match(p.endereco, '— ([^—]+) —'))[1], 'Endereço após aceitar'),
    p.total,
    p.pagamento,
    p.agendado_para,
    p.created_at
  from public.pedidos p
  where p.status = 'preparando'
    and p.pronto_em is not null
    and p.entregador_id is null
    and (p.pagamento_modalidade is distinct from 'online' or p.pagamento_status = 'pago')
    and (p.agendado_para is null or p.agendado_para <= now() + interval '45 minutes')
    and exists (
      select 1
      from public.empresa_entregadores v
      join public.empresa_unidades u on u.id = v.unidade_id
      where v.entregador_id = auth.uid()
        and v.ativo = true
        and u.ativa = true
        and u.entrega_modalidade = 'propria'
        and v.empresa_id::text = p.empresa_id::text
        and (
          v.unidade_id = p.unidade_id
          or (p.unidade_id is null and u.principal = true)
        )
    )
  order by p.prioridade desc, coalesce(p.agendado_para, p.created_at), p.created_at
  limit 50;
$$;

create or replace function public.entregador_aceitar_pedido(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oferta public.entrega_ofertas%rowtype;
  v_empresa_id text;
  v_unidade_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select p.empresa_id::text,p.unidade_id
  into v_empresa_id,v_unidade_id
  from public.pedidos p
  where p.id = p_pedido_id
  limit 1;

  if v_empresa_id is null
     or not exists (
       select 1
       from public.empresa_entregadores v
       join public.empresa_unidades u on u.id = v.unidade_id
       where v.entregador_id = auth.uid()
         and v.ativo = true
         and u.ativa = true
         and u.entrega_modalidade = 'propria'
         and v.empresa_id::text = v_empresa_id
         and (v.unidade_id = v_unidade_id or (v_unidade_id is null and u.principal = true))
     ) then
    raise exception 'Este pedido pertence a uma empresa diferente da sua equipe.';
  end if;

  perform 1
  from public.entregadores d
  where d.id = auth.uid()
    and d.aprovado = true
    and d.online = true
    and d.latitude is not null
    and d.longitude is not null
    and d.localizacao_atualizada_em >= now() - interval '30 minutes'
  for update;

  if not found then
    raise exception 'Entregador aprovado, online e com localização recente obrigatório.';
  end if;

  if exists (
    select 1
    from public.pedidos p
    where p.entregador_id = auth.uid()
      and p.status in ('preparando', 'saiu_para_entrega')
  ) then
    raise exception 'Conclua sua entrega atual antes de aceitar outra.';
  end if;

  select o.* into v_oferta
  from public.entrega_ofertas o
  where o.pedido_id = p_pedido_id
    and o.entregador_id = auth.uid()
    and o.origem = 'propria'
    and o.status = 'disponivel'
  for update;

  if not found then
    raise exception 'Esta oferta não está mais disponível para você.';
  end if;

  update public.pedidos
  set entregador_id = auth.uid(),
      entregador_valor = v_oferta.valor_oferta,
      updated_at = now()
  where id = p_pedido_id
    and status = 'preparando'
    and pronto_em is not null
    and entregador_id is null
    and (pagamento_modalidade is distinct from 'online' or pagamento_status = 'pago');

  if not found then
    update public.entrega_ofertas
    set status = 'encerrada', updated_at = now()
    where id = v_oferta.id;
    return false;
  end if;

  update public.entrega_ofertas
  set status = case when entregador_id = auth.uid() then 'aceita' else 'encerrada' end,
      updated_at = now()
  where pedido_id = p_pedido_id;

  update public.notificacoes
  set lida = true
  where pedido_id = p_pedido_id
    and tipo = 'entrega_disponivel'
    and lida = false;

  return true;
exception when unique_violation then
  raise exception 'Conclua sua entrega atual antes de aceitar outra.';
end;
$$;

create or replace function public.listar_entregas_disponiveis_proximidade()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if not exists (
    select 1 from public.entregadores d
    where d.id = auth.uid()
      and d.aprovado = true
      and d.online = true
      and d.latitude is not null
      and d.longitude is not null
      and d.localizacao_atualizada_em >= now() - interval '30 minutes'
  ) then
    raise exception 'Entregador aprovado, online e com localização recente obrigatório.';
  end if;

  select coalesce(jsonb_agg(q.dados order by q.distancia_coleta_km nulls last,q.prioridade desc,q.ordenacao_tempo,q.created_at),'[]'::jsonb)
  into v_resultado
  from (
    select
      p.prioridade,
      coalesce(p.agendado_para,p.created_at) as ordenacao_tempo,
      p.created_at,
      o.distancia_coleta_km,
      jsonb_build_object(
        'pedido_id',p.id,
        'numero',p.numero,
        'restaurante',p.empresa_nome,
        'unidade_id',u.id,
        'unidade_nome',coalesce(u.nome,'Unidade principal'),
        'bairro',coalesce((regexp_match(p.endereco,'— ([^—]+) —'))[1],'Região protegida'),
        'total',p.total,
        'pagamento',p.pagamento,
        'agendado_para',p.agendado_para,
        'created_at',p.created_at,
        'distancia_coleta_km',o.distancia_coleta_km,
        'distancia_entrega_km',p.distancia_km,
        'ganho_entregador',o.valor_oferta,
        'oferta_etapa',o.etapa,
        'oferta_raio_km',o.raio_km,
        'oferta_origem','propria'
      ) as dados
    from public.entrega_ofertas o
    join public.pedidos p on p.id = o.pedido_id
    join public.empresa_unidades u
      on u.id = coalesce(
        p.unidade_id,
        (
          select ux.id
          from public.empresa_unidades ux
          where ux.empresa_id::text = p.empresa_id::text
            and ux.principal = true
            and ux.ativa = true
          order by ux.id
          limit 1
        )
      )
    where o.entregador_id = auth.uid()
      and o.status = 'disponivel'
      and o.origem = 'propria'
      and p.status = 'preparando'
      and p.pronto_em is not null
      and p.entregador_id is null
      and (p.pagamento_modalidade is distinct from 'online' or p.pagamento_status = 'pago')
      and exists (
        select 1
        from public.empresa_entregadores v
        where v.entregador_id = auth.uid()
          and v.empresa_id::text = p.empresa_id::text
          and v.unidade_id = u.id
          and v.ativo = true
      )
    limit 50
  ) q;

  return v_resultado;
end;
$$;

commit;
