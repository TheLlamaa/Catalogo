-- 16 · Limites do bucket de fotos: até 5 MB por arquivo e só imagem (JPEG, PNG, WebP e SVG).
-- Antes, só o site validava; quem tinha acesso de admin podia subir qualquer tipo e tamanho direto pela API.
-- O site já reduz as fotos para menos de 1 MB (e o SVG do logo é limitado a 300 KB), então nada muda no uso normal.
-- Seguro rodar mais de uma vez.

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
 where id = 'fotos_produtos';

insert into public.app_meta (key, value) values ('schema_version', '16')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
