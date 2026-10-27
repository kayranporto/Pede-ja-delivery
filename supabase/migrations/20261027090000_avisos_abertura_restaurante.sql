-- Avisos de abertura para clientes que acompanham restaurantes fechados.
begin;

create table if not exists public.avisos_abertura_restaurante (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint avisos_abertura_restaurante_usuario_empresa_key unique (usuario_id, empresa_id)
);

create index if not exists avisos_abertura_restaurante_empresa_idx
  on public.avisos_abertura_restaurante (empresa_id, created_at);

alter table public.avisos_abertura_restaurante enable row level security;
drop policy if exists "cliente le seus avisos de abertura" on public.avisos_abertura_restaurante;
create policy "cliente le seus avisos de abertura"
  on public.avisos_abertura_restaurante for select to authenticated
  using (usuario_id = (select auth.uid()));
drop policy if exists "cliente cria seus avisos de abertura" on public.avisos_abertura_restaurante;
create policy "cliente cria seus avisos de abertura"
  on public.avisos_abertura_restaurante for insert to authenticated
  with check (usuario_id = (select auth.uid()));
drop policy if exists "cliente cancela seus avisos de abertura" on public.avisos_abertura_restaurante;
create policy "cliente cancela seus avisos de abertura"
  on public.avisos_abertura_restaurante for delete to authenticated
  using (usuario_id = (select auth.uid()));
grant select, insert, delete on public.avisos_abertura_restaurante to authenticated;

create or replace function private.processar_avisos_abertura_restaurante()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_aviso record;
  v_processados integer := 0;
begin
  for v_aviso in
    select a.usuario_id, a.empresa_id, e.nome
    from public.avisos_abertura_restaurante a
    join public.empresas e on e.id = a.empresa_id
    where e.publicado = true
      and e.status = true
      and private.empresa_aberta_em(a.empresa_id::text, now()) = true
    order by a.created_at
    for update of a skip locked
  loop
    insert into public.notificacoes (usuario_id, titulo, mensagem, tipo, destino)
    values (
      v_aviso.usuario_id,
      'Restaurante aberto!',
      coalesce(v_aviso.nome, 'O restaurante escolhido') || ' voltou a aceitar pedidos.',
      'restaurante_aberto',
      './html/restaurante.html?id=' || v_aviso.empresa_id::text
    );

    delete from public.avisos_abertura_restaurante
    where usuario_id = v_aviso.usuario_id
      and empresa_id = v_aviso.empresa_id;

    v_processados := v_processados + 1;
  end loop;
  return v_processados;
end;
$function$;

revoke all on function private.processar_avisos_abertura_restaurante() from public, anon, authenticated;

-- O cron verifica a disponibilidade real (incluindo horários) a cada minuto.
do $block$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'avisos-abertura-restaurante'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'avisos-abertura-restaurante',
    '* * * * *',
    'select private.processar_avisos_abertura_restaurante();'
  );
end;
$block$;

commit;
