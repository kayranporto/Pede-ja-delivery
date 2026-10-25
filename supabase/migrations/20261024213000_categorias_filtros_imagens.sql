-- Add optional real images to globally managed home filter categories.
begin;
alter table public.categorias_filtros_home
  add column if not exists imagem_url text;
alter table public.categorias_filtros_home
  drop constraint if exists categorias_filtros_home_imagem_url_https;
alter table public.categorias_filtros_home
  add constraint categorias_filtros_home_imagem_url_https
  check (imagem_url is null or (char_length(imagem_url) <= 1000 and imagem_url ~* '^https://'));
notify pgrst, 'reload schema';
commit;
