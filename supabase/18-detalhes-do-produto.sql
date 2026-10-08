-- 18 · Detalhes do produto: características (Material, Altura, Largura, Peso…) e blocos de informação
-- (Prazo de produção, Cuidados com a peça…). Seguro rodar mais de uma vez.
--
-- specs   = lista de { "n": "Material", "v": "Cimento" }          (até 12)
-- details = lista de { "t": "Cuidados com a peça", "x": "texto" } (até 6)
-- Os dois aparecem na janela do produto, logo abaixo da descrição. Quem já tem produtos não perde nada:
-- as colunas começam vazias.

alter table public.products
  add column if not exists specs   jsonb not null default '[]'::jsonb,
  add column if not exists details jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_specs_formato') then
    alter table public.products add constraint products_specs_formato
      check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 12 and length(specs::text) <= 3000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_details_formato') then
    alter table public.products add constraint products_details_formato
      check (jsonb_typeof(details) = 'array' and jsonb_array_length(details) <= 6 and length(details::text) <= 10000);
  end if;
end $$;

insert into public.app_meta (key, value) values ('schema_version', '18')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
