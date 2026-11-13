begin;

alter table public.produtos
  add column if not exists is_combo boolean not null default false,
  add column if not exists combo_itens jsonb not null default '[]'::jsonb;

alter table public.pedido_itens
  add column if not exists combo_itens jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'produtos_combo_itens_array_check'
      and conrelid = 'public.produtos'::regclass
  ) then
    alter table public.produtos
      add constraint produtos_combo_itens_array_check
      check (jsonb_typeof(combo_itens) = 'array') not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'pedido_itens_combo_itens_array_check'
      and conrelid = 'public.pedido_itens'::regclass
  ) then
    alter table public.pedido_itens
      add constraint pedido_itens_combo_itens_array_check
      check (jsonb_typeof(combo_itens) = 'array') not valid;
  end if;
end;
$$;

create or replace function private.validar_combo_produto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_produto public.produtos%rowtype;
  v_id text;
  v_quantidade integer;
  v_componentes jsonb := '[]'::jsonb;
  v_total integer;
begin
  if not coalesce(new.is_combo, false) then
    new.combo_itens := '[]'::jsonb;
    return new;
  end if;

  if jsonb_typeof(new.combo_itens) <> 'array'
     or jsonb_array_length(new.combo_itens) < 2
     or jsonb_array_length(new.combo_itens) > 10
     or coalesce(new.preco, 0) <= 0
     or (new.promocao is not null and (new.promocao <= 0 or new.promocao >= new.preco)) then
    raise exception 'Informe um preço válido e de 2 a 10 produtos para o combo.';
  end if;

  select count(*), count(distinct value ->> 'produto_id')
    into v_total, v_quantidade
  from jsonb_array_elements(new.combo_itens);
  if v_total <> v_quantidade then
    raise exception 'Não repita produtos no mesmo combo.';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(new.combo_itens)
    order by value ->> 'produto_id'
  loop
    v_id := nullif(trim(v_item ->> 'produto_id'), '');
    if coalesce(v_item ->> 'quantidade', '') !~ '^[0-9]+$' then
      raise exception 'Quantidade inválida em um produto do combo.';
    end if;
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_id is null or v_quantidade < 1 or v_quantidade > 20 then
      raise exception 'Quantidade inválida em um produto do combo.';
    end if;

    select p.* into v_produto
    from public.produtos p
    where p.id::text = v_id
      and p.empresa_id::text = new.empresa_id::text
      and p.unidade_id is not distinct from new.unidade_id
      and not p.is_combo
    limit 1;
    if not found then
      raise exception 'Os produtos do combo devem pertencer à mesma unidade e não podem ser combos.';
    end if;
    if new.disponivel and not v_produto.disponivel then
      raise exception 'Os produtos do combo devem estar disponíveis.';
    end if;
    if exists (select 1 from public.produto_variantes pv where pv.produto_id::text = v_id)
       or exists (select 1 from public.produto_grupos pg where pg.produto_id::text = v_id) then
      raise exception 'Produtos com variações ou personalizações não podem ser usados em combos.';
    end if;
    if new.disponivel and v_produto.controle_estoque and v_produto.estoque < v_quantidade then
      raise exception 'Estoque insuficiente para disponibilizar % no combo.', v_produto.nome;
    end if;

    v_componentes := v_componentes || jsonb_build_array(jsonb_build_object(
      'produto_id', v_produto.id::text,
      'nome_produto', v_produto.nome,
      'quantidade', v_quantidade
    ));
  end loop;

  new.combo_itens := v_componentes;
  new.controle_estoque := false;
  return new;
end;
$$;

revoke all on function private.validar_combo_produto() from public, anon, authenticated;
drop trigger if exists validar_combo_produto on public.produtos;
create trigger validar_combo_produto
before insert or update of is_combo, combo_itens, empresa_id, unidade_id, preco, promocao, controle_estoque, disponivel
on public.produtos
for each row execute function private.validar_combo_produto();

create or replace function private.pausar_combos_sem_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.is_combo, false) then return new; end if;
  update public.produtos combo
  set disponivel = false, updated_at = now()
  where combo.is_combo
    and combo.disponivel
    and exists (
      select 1
      from jsonb_array_elements(combo.combo_itens) item
      where item ->> 'produto_id' = new.id::text
        and (
          not new.disponivel
          or (new.controle_estoque and new.estoque < (item ->> 'quantidade')::integer)
        )
    );
  return new;
end;
$$;

revoke all on function private.pausar_combos_sem_estoque() from public, anon, authenticated;
drop trigger if exists pausar_combos_sem_estoque on public.produtos;
create trigger pausar_combos_sem_estoque
after update of disponivel, estoque on public.produtos
for each row execute function private.pausar_combos_sem_estoque();

create or replace function private.reservar_estoque_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produto public.produtos%rowtype;
  v_componente public.produtos%rowtype;
  v_item jsonb;
  v_id text;
  v_quantidade integer;
  v_necessario integer;
  v_componentes jsonb := '[]'::jsonb;
begin
  if new.produto_id is null then return new; end if;

  select p.* into v_produto
  from public.produtos p
  where p.id::text = new.produto_id
  for update;
  if not found then raise exception 'O produto do pedido não foi encontrado.'; end if;

  if coalesce(v_produto.is_combo, false) then
    if jsonb_typeof(v_produto.combo_itens) <> 'array'
       or jsonb_array_length(v_produto.combo_itens) < 2 then
      raise exception 'Este combo está incompleto e não pode ser pedido.';
    end if;

    for v_item in
      select value
      from jsonb_array_elements(v_produto.combo_itens)
      order by value ->> 'produto_id'
    loop
      v_id := nullif(v_item ->> 'produto_id', '');
      if coalesce(v_item ->> 'quantidade', '') !~ '^[0-9]+$' then
        raise exception 'A composição deste combo está inválida.';
      end if;
      v_quantidade := (v_item ->> 'quantidade')::integer;
      if v_id is null or v_quantidade < 1 or v_quantidade > 20 then
        raise exception 'A composição deste combo está inválida.';
      end if;

      select p.* into v_componente
      from public.produtos p
      where p.id::text = v_id
        and p.empresa_id::text = v_produto.empresa_id::text
        and p.unidade_id is not distinct from v_produto.unidade_id
        and p.disponivel
        and not p.is_combo
      limit 1
      for update;
      if not found then
        raise exception 'Um produto deste combo não está mais disponível.';
      end if;
      if exists (select 1 from public.produto_variantes pv where pv.produto_id::text = v_id)
         or exists (select 1 from public.produto_grupos pg where pg.produto_id::text = v_id) then
        raise exception 'Um produto deste combo exige personalização e não pode ser vendido no combo.';
      end if;

      v_necessario := v_quantidade * new.quantidade;
      if coalesce(v_componente.controle_estoque, false) then
        update public.produtos
        set estoque = estoque - v_necessario,
            disponivel = case when estoque - v_necessario <= 0 then false else disponivel end,
            updated_at = now()
        where id::text = v_id and estoque >= v_necessario;
        if not found then
          raise exception 'Estoque insuficiente para %.', v_componente.nome;
        end if;
      end if;

      v_componentes := v_componentes || jsonb_build_array(jsonb_build_object(
        'produto_id', v_componente.id::text,
        'nome_produto', v_componente.nome,
        'quantidade', v_quantidade
      ));
    end loop;
    new.combo_itens := v_componentes;
    return new;
  end if;

  new.combo_itens := '[]'::jsonb;
  if coalesce(v_produto.controle_estoque, false) then
    update public.produtos
    set estoque = estoque - new.quantidade,
        disponivel = case when estoque - new.quantidade <= 0 then false else disponivel end,
        updated_at = now()
    where id::text = new.produto_id and estoque >= new.quantidade;
    if not found then raise exception 'Estoque insuficiente para %.', new.nome_produto; end if;
  end if;
  return new;
end;
$$;

revoke all on function private.reservar_estoque_item() from public, anon, authenticated;
drop trigger if exists reservar_estoque_item on public.pedido_itens;
create trigger reservar_estoque_item
before insert on public.pedido_itens
for each row execute function private.reservar_estoque_item();

create or replace function private.restaurar_estoque_cancelamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_componente jsonb;
  v_componente_id text;
  v_quantidade integer;
  v_cupom_id uuid;
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' and not coalesce(old.estoque_devolvido, false) then
    for v_item in
      select produto_id, quantidade, combo_itens
      from public.pedido_itens
      where pedido_id = old.id
    loop
      if jsonb_typeof(coalesce(v_item.combo_itens, '[]'::jsonb)) = 'array'
         and jsonb_array_length(coalesce(v_item.combo_itens, '[]'::jsonb)) > 0 then
        for v_componente in
          select value from jsonb_array_elements(v_item.combo_itens)
        loop
          v_componente_id := nullif(v_componente ->> 'produto_id', '');
          if coalesce(v_componente ->> 'quantidade', '') ~ '^[0-9]+$' then
            v_quantidade := (v_componente ->> 'quantidade')::integer * v_item.quantidade;
            update public.produtos
            set estoque = estoque + v_quantidade, disponivel = true, updated_at = now()
            where id::text = v_componente_id and controle_estoque;
          end if;
        end loop;
      else
        update public.produtos
        set estoque = estoque + v_item.quantidade, disponivel = true, updated_at = now()
        where id::text = v_item.produto_id and controle_estoque;
      end if;
    end loop;
    update public.fidelidade_resgates
    set status = 'disponivel'
    where usuario_id = old.usuario_id
      and empresa_id = old.empresa_id
      and upper(codigo) = upper(coalesce(old.cupom, ''))
      and status = 'usado';
    if nullif(trim(coalesce(old.cupom, '')), '') is not null then
      select c.id into v_cupom_id
      from public.cupons c
      where upper(c.codigo) = upper(old.cupom)
        and (c.empresa_id = old.empresa_id or c.empresa_id is null)
      order by (c.empresa_id = old.empresa_id) desc
      limit 1
      for update;

      if v_cupom_id is not null then
      update public.cupons
        set usos = greatest(usos - 1, 0), updated_at = now()
        where id = v_cupom_id;
      end if;
    end if;
    new.estoque_devolvido := true;
  end if;
  return new;
end;
$$;

revoke all on function private.restaurar_estoque_cancelamento() from public, anon, authenticated;
drop trigger if exists a0_restaurar_estoque_cancelamento on public.pedidos;
create trigger a0_restaurar_estoque_cancelamento
before update of status on public.pedidos
for each row execute function private.restaurar_estoque_cancelamento();

notify pgrst, 'reload schema';
commit;
