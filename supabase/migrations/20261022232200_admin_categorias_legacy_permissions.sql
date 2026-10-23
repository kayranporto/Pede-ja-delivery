-- Permite a administradores com permissões legadas de Configurações/Administração gerenciar os filtros.
begin;
drop policy if exists "admin gerencia filtros categorias inserir" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias inserir"
on public.categorias_filtros_home for insert to authenticated
with check ((select public.usuario_tem_permissao_admin('categorias_filtros') or public.usuario_tem_permissao_admin('configuracoes') or public.usuario_tem_permissao_admin('administradores')));
drop policy if exists "admin gerencia filtros categorias atualizar" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias atualizar"
on public.categorias_filtros_home for update to authenticated
using ((select public.usuario_tem_permissao_admin('categorias_filtros') or public.usuario_tem_permissao_admin('configuracoes') or public.usuario_tem_permissao_admin('administradores')))
with check ((select public.usuario_tem_permissao_admin('categorias_filtros') or public.usuario_tem_permissao_admin('configuracoes') or public.usuario_tem_permissao_admin('administradores')));
drop policy if exists "admin gerencia filtros categorias excluir" on public.categorias_filtros_home;
create policy "admin gerencia filtros categorias excluir"
on public.categorias_filtros_home for delete to authenticated
using ((select public.usuario_tem_permissao_admin('categorias_filtros') or public.usuario_tem_permissao_admin('configuracoes') or public.usuario_tem_permissao_admin('administradores')));
commit;
