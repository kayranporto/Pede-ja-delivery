begin;

-- Contas autenticadas não devem ver variantes de produtos indisponíveis de outros restaurantes.
-- A policy separada de proprietário continua permitindo que o dono gerencie seu catálogo.
drop policy if exists catalogo_variantes_authenticated on public.produto_variantes;
create policy catalogo_variantes_authenticated
on public.produto_variantes for select to authenticated
using (
  ativo = true
  and exists (
    select 1
    from public.produtos p
    where p.id::text = produto_variantes.produto_id
      and p.disponivel = true
  )
);

commit;
