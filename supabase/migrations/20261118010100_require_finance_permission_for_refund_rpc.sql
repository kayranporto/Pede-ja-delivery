-- Exige permissão financeira explícita também na RPC de preparo do reembolso.
-- A autorização na Edge Function não substitui a proteção da camada SQL.

begin;

create or replace function public.admin_preparar_reembolso(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_permissoes jsonb := auth.jwt() -> 'app_metadata' -> 'admin_permissions';
begin
  if not private.is_admin()
     or jsonb_typeof(v_permissoes) is distinct from 'array'
     or not (v_permissoes ? 'financeiro') then
    raise exception 'Permissão financeira necessária.' using errcode = '42501';
  end if;

  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_pedido.pagamento_modalidade <> 'online'
     or v_pedido.pagamento_status <> 'pago'
     or nullif(v_pedido.pagamento_id, '') is null then
    raise exception 'O pedido não possui pagamento online confirmado para reembolso.';
  end if;
  if v_pedido.reembolso_status not in ('pendente','falhou','processando') then
    raise exception 'O pedido não possui reembolso pendente.';
  end if;

  update public.pedidos
  set reembolso_status = 'processando', updated_at = now()
  where id = p_pedido_id;

  insert into public.admin_auditoria(admin_id, acao, alvo_id, detalhes)
  values (
    auth.uid(), 'iniciar_reembolso', p_pedido_id::text,
    jsonb_build_object('payment_id', v_pedido.pagamento_id, 'valor', v_pedido.total)
  );

  return jsonb_build_object(
    'pedido_id', v_pedido.id,
    'payment_id', v_pedido.pagamento_id,
    'preference_id', v_pedido.pagamento_preferencia_id,
    'valor', v_pedido.total,
    'moeda', coalesce(v_pedido.pagamento_moeda, 'BRL')
  );
end;
$$;

revoke all on function public.admin_preparar_reembolso(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_preparar_reembolso(uuid)
  to authenticated;

notify pgrst, 'reload schema';
commit;
