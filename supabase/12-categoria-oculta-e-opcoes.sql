-- 12 · Categorias ocultas e limite no tamanho das opções dos itens do pedido. Seguro rodar mais de uma vez.
--
-- 1) "visible": esconder uma categoria do menu da vitrine sem excluir (os produtos dela continuam
--    aparecendo em "Todos os modelos" e nas outras categorias).
-- 2) As opções que o cliente escolhe (Cor: Azul…) iam para o pedido sem limite de tamanho. Agora cada
--    item aceita no máximo 10 opções, com nome de até 40 e valor de até 80 caracteres.
--    É um gatilho próprio (não troca nenhuma função antiga), então rodar outros arquivos de novo não o desfaz.

alter table public.categories add column if not exists visible boolean not null default true;

create or replace function public.limitar_opcoes_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  it jsonb;
  k text;
  v jsonb;
begin
  if jsonb_typeof(NEW.items) is distinct from 'array' then
    return NEW; -- o gatilho de preço recusa pedidos sem lista de itens
  end if;
  for it in select * from jsonb_array_elements(NEW.items) loop
    if jsonb_typeof(it->'options') = 'object' then
      if (select count(*) from jsonb_object_keys(it->'options')) > 10 then
        raise exception 'Opções demais em um item do pedido (máximo 10).';
      end if;
      for k, v in select * from jsonb_each(it->'options') loop
        if char_length(k) > 40 or jsonb_typeof(v) is distinct from 'string' or char_length(v #>> '{}') > 80 then
          raise exception 'Opção inválida em um item do pedido.';
        end if;
      end loop;
    end if;
  end loop;
  return NEW;
end $$;
revoke execute on function public.limitar_opcoes_pedido() from public, anon, authenticated;

-- Nome começa com "o" para rodar antes de "precificar_orders" (gatilhos rodam em ordem alfabética)
drop trigger if exists opcoes_orders on public.orders;
create trigger opcoes_orders before insert on public.orders
  for each row execute function public.limitar_opcoes_pedido();

insert into public.app_meta (key, value) values ('schema_version', '12')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
