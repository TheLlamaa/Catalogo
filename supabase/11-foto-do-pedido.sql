-- 11 · Foto de referência dos pedidos personalizados só pode vir embutida na mensagem (correção de segurança).
-- Antes, quem enviava o pedido direto pela API podia colocar um link externo no lugar da foto; ao abrir o
-- pedido no painel, o navegador do admin buscava a imagem nesse endereço (revelando IP e horário).
-- Só troca a função de validação dos pedidos. Seguro rodar mais de uma vez.

create or replace function public.validar_pedido()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  j jsonb := to_jsonb(NEW);
  tel text := regexp_replace(coalesce(j->>'client_phone', ''), '\D', '', 'g');
  metodo text := j->>'delivery_method';
  endereco text := coalesce(j->>'delivery_address', '');
begin
  if char_length(btrim(coalesce(j->>'client_name', ''))) not between 2 and 100 then
    raise exception 'Informe seu nome (entre 2 e 100 caracteres).';
  end if;
  if tel !~ '^(55)?[1-9][1-9]9[0-9]{8}$' then
    raise exception 'WhatsApp inválido. Use DDD e 9 dígitos, ex: (48) 99999-9999.';
  end if;

  if TG_TABLE_NAME = 'orders' then
    if coalesce((j->>'total')::numeric, -1) < 0 or (j->>'total')::numeric >= 1000000 then
      raise exception 'Total do pedido inválido.';
    end if;
    if char_length(coalesce(j->>'notes', '')) > 500 then
      raise exception 'Observações: máximo de 500 caracteres.';
    end if;
    if metodo is not null and metodo not in ('retirada', 'entrega') then
      raise exception 'Forma de recebimento inválida.';
    end if;
    if metodo = 'entrega' and char_length(btrim(endereco)) < 5 then
      raise exception 'Informe o endereço para entrega.';
    end if;
    if char_length(endereco) > 300 then
      raise exception 'Endereço muito longo.';
    end if;
    if jsonb_typeof(j->'items') is distinct from 'array' then
      raise exception 'Pedido sem itens válidos.';
    elsif jsonb_array_length(j->'items') not between 1 and 50 then
      raise exception 'Pedido sem itens válidos.';
    end if;
  else
    if char_length(btrim(coalesce(j->>'description', ''))) not between 5 and 2000 then
      raise exception 'A descrição deve ter entre 5 e 2000 caracteres.';
    end if;
    if char_length(coalesce(j->>'image_url', '')) >= 700000 then
      raise exception 'Imagem muito grande.';
    end if;
    -- A foto de referência só pode vir embutida (o site sempre manda assim). Um link externo faria o
    -- navegador do admin buscar a imagem no servidor de quem mandou, revelando o IP e a hora em que abriu.
    if coalesce(j->>'image_url', '') <> ''
       and j->>'image_url' !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$' then
      raise exception 'Imagem inválida. Envie a foto pelo formulário do site.';
    end if;
  end if;

  NEW.status := 'novo';
  NEW.created_at := now(); -- a data também é do servidor (ver limitar_pedidos)
  return NEW;
end $$;

-- Conferência: pedidos já gravados com foto que não é embutida (deve voltar 0; se voltar, veja antes de apagar)
select id, created_at, client_name, left(image_url, 80) as inicio_da_imagem
  from public.custom_orders
 where coalesce(image_url, '') <> '' and image_url !~ '^data:image/';

insert into public.app_meta (key, value) values ('schema_version', '11')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
