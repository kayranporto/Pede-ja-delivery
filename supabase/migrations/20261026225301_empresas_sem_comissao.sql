-- Modelo comercial do PedeJá: mensalidade fixa sem comissão por pedido.
-- Zera a taxa usada pelos relatórios financeiros e impede sua reintrodução acidental.

begin;

update public.empresas
set taxa_plataforma_percentual = 0
where taxa_plataforma_percentual <> 0;

alter table public.empresas
  alter column taxa_plataforma_percentual set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empresas_sem_comissao_check'
      and conrelid = 'public.empresas'::regclass
  ) then
    alter table public.empresas
      add constraint empresas_sem_comissao_check
      check (taxa_plataforma_percentual = 0);
  end if;
end;
$$;

commit;
