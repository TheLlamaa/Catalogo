-- 14 · Estoque somado por produto no pedido. Seguro rodar mais de uma vez.
--
-- Antes, o banco conferia o estoque linha a linha: duas linhas do mesmo produto com opções diferentes
-- (ex.: 3 azuis + 3 vermelhas, com 5 em estoque) passavam. O site já bloqueava isso; agora o banco também.
-- Só atualiza a função de preço do pedido (a de desconto, arquivo 13, não muda).

create or replace function public.precificar_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  it jsonb;
  prod record;
  novos jsonb := '[]'::jsonb;
  soma numeric := 0;
  qtd int;
  controla boolean;
begin
  -- Painel > Site > Produtos > "Controlar estoque": desligado, o estoque não limita o pedido
  select coalesce((select value <> 'false' from public.site_settings where key = 'stockControl'), true) into controla;

  if jsonb_typeof(NEW.items) is distinct from 'array' or jsonb_array_length(NEW.items) not between 1 and 50 then
    raise exception 'Pedido sem itens válidos.';
  end if;

  for it in select * from jsonb_array_elements(NEW.items) loop
    if jsonb_typeof(it) is distinct from 'object'
       or coalesce(it->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(it->>'quantity', '') !~ '^[0-9]{1,3}$' then
      raise exception 'Pedido com item inválido.';
    end if;
    qtd := (it->>'quantity')::int;
    if qtd < 1 or qtd > 99 then
      raise exception 'Quantidade inválida.';
    end if;

    select p.title, p.price, p.stock, p.active, p.image_urls into prod
      from public.products p where p.id = (it->>'id')::uuid;
    if not found or prod.active is not true then
      raise exception 'Um dos produtos do carrinho não está mais disponível.';
    end if;
    if controla and coalesce(prod.stock, 0) < qtd then
      raise exception 'Estoque insuficiente para "%". Atualize o carrinho.', prod.title;
    end if;

    soma := soma + prod.price * qtd;
    novos := novos || jsonb_build_array(jsonb_build_object(
      'id', it->>'id',
      'title', prod.title,
      'price', prod.price,
      'quantity', qtd,
      'options', case when jsonb_typeof(it->'options') = 'object' then it->'options' else '{}'::jsonb end,
      'imageUrls', to_jsonb(coalesce(prod.image_urls[1:1], '{}'::text[]))
    ));
  end loop;

  -- O estoque é do produto, não da linha: duas linhas do mesmo produto (opções diferentes) somam.
  if controla then
    select p.title into prod
      from (select (e->>'id')::uuid as id, sum((e->>'quantity')::int) as qtd from jsonb_array_elements(novos) e group by 1) s
      join public.products p on p.id = s.id
      where coalesce(p.stock, 0) < s.qtd
      limit 1;
    if found then
      raise exception 'Estoque insuficiente para "%". Atualize o carrinho.', prod.title;
    end if;
  end if;

  NEW.items := novos;
  NEW.total := soma;
  return NEW;
end;
$$;

revoke execute on function public.precificar_pedido() from public, anon, authenticated;

drop trigger if exists precificar_orders on public.orders;
create trigger precificar_orders before insert on public.orders
  for each row execute function public.precificar_pedido();

insert into public.app_meta (key, value) values ('schema_version', '14')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
