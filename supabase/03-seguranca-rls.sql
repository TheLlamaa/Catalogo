-- 03 · Regras de acesso (RLS). É o que impede um visitante de ler pedidos ou mexer nos produtos.
-- Pode rodar mais de uma vez. Precisa do 01 e do 02 antes.

alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.custom_orders   enable row level security;
alter table public.product_private enable row level security;
alter table public.site_settings   enable row level security;
alter table public.admins          enable row level security;
alter table public.app_meta        enable row level security;

-- Políticas antigas, abertas a qualquer visitante (criadas no começo do projeto). Nunca devem existir.
drop policy if exists "Permitir tudo em categorias"    on public.categories;
drop policy if exists "Permitir tudo em produtos"      on public.products;
drop policy if exists "Permitir tudo em orders"        on public.orders;
drop policy if exists "Permitir tudo em custom_orders" on public.custom_orders;
drop policy if exists "Leitura pública de produtos"    on public.products;   -- mostrava produtos inativos
drop policy if exists "Leitura pública de categorias"  on public.categories; -- duplicada

-- Categorias: todos leem; admin faz tudo
drop policy if exists "publico le categorias" on public.categories;
create policy "publico le categorias" on public.categories
  for select to public using (true);
drop policy if exists "admin total categorias" on public.categories;
create policy "admin total categorias" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Produtos: o público só vê os ativos; admin faz tudo
drop policy if exists "publico le produtos ativos" on public.products;
create policy "publico le produtos ativos" on public.products
  for select to public using (active = true);
drop policy if exists "admin total produtos" on public.products;
create policy "admin total produtos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: o visitante só CRIA (os gatilhos validam); só o admin lê, altera e apaga
drop policy if exists "publico cria pedido" on public.orders;
create policy "publico cria pedido" on public.orders
  for insert to anon, authenticated with check (true);
drop policy if exists "admin total pedidos" on public.orders;
create policy "admin total pedidos" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico cria pedido custom" on public.custom_orders;
create policy "publico cria pedido custom" on public.custom_orders
  for insert to anon, authenticated with check (true);
drop policy if exists "admin total pedidos custom" on public.custom_orders;
create policy "admin total pedidos custom" on public.custom_orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Link do modelo 3D: só admin (o visitante nem tem permissão na tabela)
drop policy if exists "product_private só admin" on public.product_private;
create policy "product_private só admin" on public.product_private
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.product_private from anon;
grant select, insert, update, delete on public.product_private to authenticated;

-- Textos do site: todos leem; só o admin escreve
drop policy if exists "site_settings leitura publica" on public.site_settings;
create policy "site_settings leitura publica" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "site_settings admin escreve" on public.site_settings;
create policy "site_settings admin escreve" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Equipe: só admin vê, adiciona e remove (não existe edição; e o gatilho impede remover o último/o próprio)
drop policy if exists "admins leitura" on public.admins;
create policy "admins leitura" on public.admins
  for select to authenticated using (public.is_admin());
drop policy if exists "admins adiciona" on public.admins;
create policy "admins adiciona" on public.admins
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins remove" on public.admins;
create policy "admins remove" on public.admins
  for delete to authenticated using (public.is_admin());
revoke all on public.admins from anon;
revoke update on public.admins from authenticated;

-- Versão do banco: o admin só lê; quem grava é o SQL de cada atualização
drop policy if exists "app_meta admin le" on public.app_meta;
create policy "app_meta admin le" on public.app_meta
  for select to authenticated using (public.is_admin());
revoke all on public.app_meta from anon;
revoke insert, update, delete on public.app_meta from authenticated;

notify pgrst, 'reload schema';
