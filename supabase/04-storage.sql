-- 04 · Fotos dos produtos (Storage). Pode rodar mais de uma vez.
-- O bucket é público para leitura (as fotos aparecem na vitrine); só o admin envia, troca e apaga.

insert into storage.buckets (id, name, public)
values ('fotos_produtos', 'fotos_produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "admin envia fotos de produtos" on storage.objects;
create policy "admin envia fotos de produtos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos_produtos' and public.is_admin());

drop policy if exists "admin altera fotos de produtos" on storage.objects;
create policy "admin altera fotos de produtos" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos_produtos' and public.is_admin())
  with check (bucket_id = 'fotos_produtos' and public.is_admin());

drop policy if exists "admin apaga fotos de produtos" on storage.objects;
create policy "admin apaga fotos de produtos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos_produtos' and public.is_admin());
