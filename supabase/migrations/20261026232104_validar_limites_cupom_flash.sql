-- Ofertas relâmpago dependem de limites de uso e validade aplicados de forma atômica no checkout.
-- A função já está conectada ao trigger zz_validar_promocao_avancada em pedidos.
create or replace function private.validar_promocao_avancada()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_cupom public.cupons%rowtype;
  v_usos_usuario integer := 0;
  v_outros_pedidos integer := 0;
  v_dia smallint := extract(dow from now())::smallint;
  v_hora time := localtime;
  v_desconto numeric(12,2) := 0;
  v_limite_termino timestamptz;
begin
  if new.cupom is null or nullif(trim(new.cupom), '') is null then
    return new;
  end if;

  -- Locking the coupon serializes redemptions; two simultaneous orders cannot
  -- both consume the final use of the same coupon.
  select c.* into v_cupom
  from public.cupons c
  where upper(c.codigo) = upper(trim(new.cupom))
    and (c.empresa_id is null or c.empresa_id = new.empresa_id)
  order by (c.empresa_id is not null) desc
  limit 1
  for update;

  -- Preserve the three legacy hard-coded codes handled by criar_pedido_impl.
  -- Other unknown codes keep their historical behavior (no extra discount).
  if not found then
    return new;
  end if;

  if v_cupom.ativo is distinct from true then
    raise exception 'Este cupom está pausado ou indisponível.';
  end if;

  if v_cupom.inicio is not null and v_cupom.inicio > now() then
    raise exception 'Este cupom ainda não está válido.';
  end if;

  v_limite_termino := coalesce(v_cupom.fim, v_cupom.validade);
  if v_limite_termino is not null and v_limite_termino <= now() then
    raise exception 'A validade deste cupom terminou.';
  end if;

  if v_cupom.limite_usos is not null
     and coalesce(v_cupom.usos, 0) >= v_cupom.limite_usos then
    raise exception 'Esta oferta atingiu o limite total de utilizações.';
  end if;

  if new.subtotal < greatest(coalesce(v_cupom.pedido_minimo, 0), coalesce(v_cupom.valor_minimo, 0)) then
    raise exception 'O valor do pedido não atinge o mínimo deste cupom.';
  end if;

  if coalesce(v_cupom.primeiro_pedido, false) then
    select count(*) into v_outros_pedidos
    from public.pedidos p
    where p.usuario_id = new.usuario_id
      and p.status not in ('cancelado', 'cancelled', 'rejeitado', 'recusado');
    if v_outros_pedidos > 0 then
      raise exception 'Este cupom só pode ser utilizado no primeiro pedido.';
    end if;
  end if;

  if cardinality(coalesce(v_cupom.dias_semana, '{}'::smallint[])) > 0
     and not (v_dia = any(v_cupom.dias_semana)) then
    raise exception 'Este cupom não é válido hoje.';
  end if;

  if v_cupom.horario_inicio is not null and v_cupom.horario_fim is not null then
    if v_cupom.horario_inicio <= v_cupom.horario_fim then
      if v_hora < v_cupom.horario_inicio or v_hora > v_cupom.horario_fim then
        raise exception 'Este cupom não é válido neste horário.';
      end if;
    else
      if v_hora < v_cupom.horario_inicio and v_hora > v_cupom.horario_fim then
        raise exception 'Este cupom não é válido neste horário.';
      end if;
    end if;
  end if;

  select count(*) into v_usos_usuario
  from public.pedidos p
  where p.usuario_id = new.usuario_id
    and upper(coalesce(p.cupom, '')) = upper(v_cupom.codigo)
    and (v_cupom.empresa_id is null or p.empresa_id = v_cupom.empresa_id)
    and p.status not in ('cancelado', 'cancelled');

  if v_usos_usuario >= coalesce(v_cupom.limite_por_usuario, 1) then
    raise exception 'Você já atingiu o limite de uso deste cupom.';
  end if;

  v_desconto := case v_cupom.tipo
    when 'percentual' then round(coalesce(new.subtotal, 0) * least(greatest(coalesce(v_cupom.valor, 0), 0), 100) / 100, 2)
    when 'fixo' then least(greatest(coalesce(v_cupom.valor, 0), 0), coalesce(new.subtotal, 0))
    when 'frete' then greatest(coalesce(new.taxa_entrega, 0), 0)
    else 0
  end;

  if v_cupom.max_desconto is not null then
    v_desconto := least(v_desconto, greatest(v_cupom.max_desconto, 0));
  end if;

  new.desconto := least(greatest(v_desconto, 0), greatest(coalesce(new.subtotal, 0) + coalesce(new.taxa_entrega, 0), 0));
  new.total := greatest(0, coalesce(new.subtotal, 0) + coalesce(new.taxa_entrega, 0) - new.desconto);

  -- The count is incremented in the same transaction as the order insert.
  -- Any later failure rolls the counter back automatically.
  update public.cupons
  set usos = coalesce(usos, 0) + 1,
      updated_at = now()
  where id = v_cupom.id;

  return new;
end;
$function$;

comment on function private.validar_promocao_avancada() is
  'Valida validade, status, valor mínimo e limites por cupom e por usuário; aplica desconto e contabiliza cada uso atomicamente no pedido.';
