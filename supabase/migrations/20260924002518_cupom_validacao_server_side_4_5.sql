create or replace function private.preparar_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_empresa record;
  v_usuario record;
  v_cupom public.cupons%rowtype;
  v_codigo text;
  v_endereco_normalizado text;
  v_dia smallint := extract(dow from now())::smallint;
  v_hora time := localtime;
  v_usos_usuario integer := 0;
  v_desconto numeric := 0;
begin
  select e.telefone,e.cidade_atendimento,e.uf_atendimento,e.bairros_atendidos,e.tempo_estimado_min,e.tempo_estimado_max
  into v_empresa from public.empresas e
  where e.id::text=new.empresa_id and e.publicado=true and e.status=true limit 1;
  if not found then raise exception 'O restaurante não está publicado ou não está recebendo pedidos.'; end if;
  select trim(concat_ws(' ',u.nome,u.sobrenome)) as nome,u.telefone into v_usuario from public.usuarios u where u.id=new.usuario_id;
  new.cliente_nome:=nullif(v_usuario.nome,''); new.cliente_telefone:=nullif(v_usuario.telefone,'');
  new.empresa_telefone:=nullif(v_empresa.telefone,''); new.previsao_min:=coalesce(v_empresa.tempo_estimado_min,25);
  new.previsao_max:=coalesce(v_empresa.tempo_estimado_max,45); new.pagamento_status:='pendente';
  v_endereco_normalizado:=lower(coalesce(new.endereco,''));
  if nullif(trim(v_empresa.cidade_atendimento),'') is not null and position(lower(trim(v_empresa.cidade_atendimento)) in v_endereco_normalizado)=0 then
    raise exception 'O endereço informado está fora da cidade atendida pelo restaurante.';
  end if;
  if nullif(trim(v_empresa.uf_atendimento),'') is not null and position(lower(trim(v_empresa.uf_atendimento)) in v_endereco_normalizado)=0 then
    raise exception 'O endereço informado está fora do estado atendido pelo restaurante.';
  end if;
  if cardinality(coalesce(v_empresa.bairros_atendidos,'{}'::text[]))>0 and not exists (
    select 1 from unnest(v_empresa.bairros_atendidos) bairro
    where nullif(trim(bairro),'') is not null and position(lower(trim(bairro)) in v_endereco_normalizado)>0
  ) then raise exception 'O bairro informado não está na área de entrega do restaurante.'; end if;
  v_codigo:=nullif(upper(trim(coalesce(new.cupom,''))),'');
  if v_codigo is null then new.cupom:=null; new.desconto:=0; new.total:=greatest(0,new.subtotal+new.taxa_entrega); return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.usuario_id::text));
  select c.* into v_cupom from public.cupons c
  where upper(c.codigo)=v_codigo and (c.empresa_id is null or c.empresa_id=new.empresa_id) and c.ativo=true
    and c.inicio<=now() and (c.fim is null or c.fim>=now()) and (c.validade is null or c.validade>=now())
    and (c.limite_usos is null or c.usos<c.limite_usos)
  order by (c.empresa_id is not null) desc limit 1 for update;
  if not found then raise exception 'Cupom inválido, expirado ou esgotado.'; end if;
  if cardinality(coalesce(v_cupom.dias_semana,'{}'::smallint[]))>0 and not (v_dia=any(v_cupom.dias_semana)) then raise exception 'Este cupom não é válido hoje.'; end if;
  if v_cupom.horario_inicio is not null and v_cupom.horario_fim is not null then
    if v_cupom.horario_inicio<=v_cupom.horario_fim then
      if v_hora<v_cupom.horario_inicio or v_hora>v_cupom.horario_fim then raise exception 'Este cupom não é válido neste horário.'; end if;
    elsif v_hora<v_cupom.horario_inicio and v_hora>v_cupom.horario_fim then raise exception 'Este cupom não é válido neste horário.'; end if;
  end if;
  if new.subtotal<coalesce(v_cupom.pedido_minimo,0) then raise exception 'Este cupom exige pedido mínimo de R$ %.',to_char(v_cupom.pedido_minimo,'FM999999990D00'); end if;
  if v_cupom.primeiro_pedido and exists(select 1 from public.pedidos p where p.usuario_id=new.usuario_id and p.status<>'cancelado') then raise exception 'Este cupom é válido somente no primeiro pedido.'; end if;
  select count(*) into v_usos_usuario from public.pedidos p where p.usuario_id=new.usuario_id and upper(coalesce(p.cupom,''))=upper(v_cupom.codigo)
    and (v_cupom.empresa_id is null or p.empresa_id=v_cupom.empresa_id) and p.status<>'cancelado';
  if v_usos_usuario>=greatest(coalesce(v_cupom.limite_por_usuario,1),1) then raise exception 'Você já atingiu o limite de uso deste cupom.'; end if;
  case v_cupom.tipo
    when 'percentual' then v_desconto:=round(new.subtotal*least(greatest(v_cupom.valor,0),100)/100,2);
    when 'fixo' then v_desconto:=least(greatest(v_cupom.valor,0),new.subtotal);
    when 'frete' then v_desconto:=greatest(new.taxa_entrega,0);
    else raise exception 'Tipo de cupom inválido.';
  end case;
  if v_cupom.max_desconto is not null then v_desconto:=least(v_desconto,greatest(v_cupom.max_desconto,0)); end if;
  v_desconto:=least(greatest(v_desconto,0),greatest(new.subtotal+new.taxa_entrega,0));
  new.cupom:=v_codigo; new.desconto:=round(v_desconto,2); new.total:=greatest(0,new.subtotal+new.taxa_entrega-new.desconto);
  update public.cupons set usos=usos+1,updated_at=now() where id=v_cupom.id;
  return new;
end;
$function$;
revoke all on function private.preparar_pedido() from public,anon,authenticated;
