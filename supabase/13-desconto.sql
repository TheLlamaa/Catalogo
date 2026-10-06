-- 13 · Desconto em % no produto. Seguro rodar mais de uma vez.
--
-- 1) products.discount_percent: 0 a 90 (0 = sem desconto). A vitrine mostra o preço antigo riscado e o novo.
-- 2) O preço do pedido continua sendo calculado pelo banco (precificar_pedido, arquivo 07). Este arquivo
--    acrescenta um gatilho próprio, que roda logo depois dele e aplica o desconto de cada produto.
--    É uma função separada: rodar os arquivos antigos de novo não desfaz o desconto.

alter table public.products add column if not exists discount_percent smallint not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_discount_percent_faixa') then
    alter table public.products add constraint products_discount_percent_faixa check (discount_percent between 0 and 90);
  end if;
end $$;

create or replace function public.aplicar_desconto_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  it jsonb;
  d int;
  cheio numeric;
  preco numeric;
  novos jsonb := '[]'::jsonb;
  soma numeric := 0;
begin
  -- Os itens já chegam aqui com título e preço cheio do banco (gatilho precificar_orders)
  if jsonb_typeof(NEW.items) is distinct from 'array' then
    return NEW;
  end if;
  for it in select * from jsonb_array_elements(NEW.items) loop
    select coalesce(p.discount_percent, 0) into d from public.products p where p.id = (it->>'id')::uuid;
    cheio := (it->>'price')::numeric;
    if coalesce(d, 0) > 0 then
      preco := round(cheio * (100 - d) / 100, 2);
      it := it || jsonb_build_object('price', preco, 'fullPrice', cheio, 'discount', d);
    else
      preco := cheio;
    end if;
    soma := soma + preco * (it->>'quantity')::int;
    novos := novos || jsonb_build_array(it);
  end loop;
  NEW.items := novos;
  NEW.total := soma;
  return NEW;
end $$;
revoke execute on function public.aplicar_desconto_pedido() from public, anon, authenticated;

-- Nome começa com "pro" para rodar logo depois de "precificar_orders" (gatilhos rodam em ordem alfabética)
drop trigger if exists promocao_orders on public.orders;
create trigger promocao_orders before insert on public.orders
  for each row execute function public.aplicar_desconto_pedido();

insert into public.app_meta (key, value) values ('schema_version', '13')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
