-- Multi Delivery 4.5.0: a logística deixa de ser uma frota global.
-- Toda unidade passa a operar exclusivamente com entregadores vinculados
-- à própria empresa/unidade através de public.empresa_entregadores.

begin;

alter table public.empresa_unidades
  alter column entrega_modalidade set default 'propria';

-- Migra unidades existentes para o modelo de entrega própria.
update public.empresa_unidades
set entrega_modalidade = 'propria',
    updated_at = now()
where entrega_modalidade is distinct from 'propria';

-- Encerra ofertas globais que ainda estiverem abertas.
update public.entrega_ofertas
set status = 'encerrada',
    updated_at = now()
where status = 'disponivel'
  and origem = 'plataforma';

-- A plataforma não oferece mais as modalidades de frota global/híbrida.
do $$
begin
  if exists (
    select 1
    from pg_constraint
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

-- Nenhuma conta administrativa deve voltar a controlar a tarifa individual
-- dos entregadores pela antiga área global. A gestão fica no contexto da empresa.
revoke all on function public.admin_definir_valor_entregador(uuid,numeric)
  from public, anon, authenticated;

commit;
