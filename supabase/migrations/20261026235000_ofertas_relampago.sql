-- Ofertas relâmpago: usa o motor de cupons existente para manter limites e validade validados no servidor.
begin;

alter table public.cupons
  add column if not exists relampago boolean not null default false,
  add column if not exists titulo_relampago text,
  add column if not exists descricao_relampago text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cupons_relampago_campos_validos'
      and conrelid = 'public.cupons'::regclass
  ) then
    alter table public.cupons
      add constraint cupons_relampago_campos_validos
      check (
        not relampago
        or (
          empresa_id is not null
          and limite_usos is not null
          and limite_usos > 0
          and inicio is not null
          and fim is not null
          and fim > inicio
          and titulo_relampago is not null
          and char_length(trim(titulo_relampago)) between 4 and 70
          and (descricao_relampago is null or char_length(descricao_relampago) <= 180)
        )
      );
  end if;
end
$$;

create index if not exists cupons_relampago_vitrine_idx
  on public.cupons (fim asc, empresa_id)
  where relampago = true and ativo = true;

comment on column public.cupons.relampago is
  'Marca cupom por tempo e quantidade limitados para destaque público na Home.';
comment on column public.cupons.titulo_relampago is
  'Título curto exibido na vitrine pública de ofertas relâmpago.';
comment on column public.cupons.descricao_relampago is
  'Descrição promocional pública, sem dados pessoais.';

commit;
