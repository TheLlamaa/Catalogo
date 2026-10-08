-- 17 · Lista de pedidos personalizados leve. Seguro rodar mais de uma vez.
--
-- A foto de referência (custom_orders.image_url) é guardada embutida, com até ~700 mil caracteres por pedido.
-- O painel baixava todas elas a cada atualização (a cada 30 s e a cada pedido novo). Esta coluna diz se o pedido
-- tem foto sem precisar baixá-la: a lista usa has_image e a foto só é buscada quando o pedido é aberto.

alter table public.custom_orders
  add column if not exists has_image boolean generated always as (coalesce(image_url, '') <> '') stored;

insert into public.app_meta (key, value) values ('schema_version', '17')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
