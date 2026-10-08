-- 15 · Baixa automática de estoque. Seguro rodar mais de uma vez.
--
-- Antes, o banco só RECUSAVA pedido acima do estoque; nunca descontava. Dez clientes podiam pedir a mesma
-- peça de estoque 1. Agora, com "Controlar estoque" ligado no painel (padrão):
--   1) ao criar o pedido, o estoque de cada produto cai pela quantidade pedida (conta atômica: se dois pedidos
--      chegam juntos, o segundo é recusado em vez de zerar abaixo de 0);
--   2) ao CANCELAR o pedido, as unidades voltam ao estoque; se o pedido cancelado for reaberto, saem de novo.
-- Pedido excluído no painel não devolve estoque (excluir é limpeza; para devolver, cancele antes).
-- Com "Controlar estoque" desligado, nada muda no estoque.
-- São funções novas e separadas das antigas: rodar os arquivos 02, 07 ou 14 de novo não desfaz isto.

create or replace function public.baixar_estoque_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  controla boolean;
  r record;
begin
  select coalesce((select value <> 'false' from public.site_settings where key = 'stockControl'), true) into controla;
  if not controla then return NEW; end if;

  for r in
    select (e->>'id')::uuid as id, sum((e->>'quantity')::int) as qtd
      from jsonb_array_elements(NEW.items) e group by 1
  loop
    update public.products set stock = stock - r.qtd where id = r.id and coalesce(stock, 0) >= r.qtd;
    if not found then
      raise exception 'Estoque insuficiente. Atualize o carrinho.';
    end if;
  end loop;
  return NEW;
end $$;
revoke execute on function public.baixar_estoque_pedido() from public, anon, authenticated;

drop trigger if exists baixa_estoque_orders on public.orders;
create trigger baixa_estoque_orders after insert on public.orders
  for each row execute function public.baixar_estoque_pedido();

create or replace function public.ajustar_estoque_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  controla boolean;
  sinal int;
  r record;
begin
  if NEW.status is not distinct from OLD.status then return NEW; end if;
  if NEW.status = 'cancelado' and OLD.status is distinct from 'cancelado' then sinal := 1;       -- devolve
  elsif OLD.status = 'cancelado' and NEW.status is distinct from 'cancelado' then sinal := -1;   -- reabriu: tira de novo
  else return NEW;
  end if;

  select coalesce((select value <> 'false' from public.site_settings where key = 'stockControl'), true) into controla;
  if not controla then return NEW; end if;

  for r in
    select (e->>'id')::uuid as id, sum((e->>'quantity')::int) as qtd
      from jsonb_array_elements(NEW.items) e group by 1
  loop
    update public.products set stock = greatest(coalesce(stock, 0) + sinal * r.qtd, 0) where id = r.id;
  end loop;
  return NEW;
end $$;
revoke execute on function public.ajustar_estoque_status() from public, anon, authenticated;

drop trigger if exists estoque_status_orders on public.orders;
create trigger estoque_status_orders after update of status on public.orders
  for each row execute function public.ajustar_estoque_status();

insert into public.app_meta (key, value) values ('schema_version', '15')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
