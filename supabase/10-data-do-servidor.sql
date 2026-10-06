-- 10 · Data dos pedidos e do log de erros sempre do servidor (correção de segurança).
-- Antes, quem enviava um pedido pela API podia escolher o "created_at". Com 20 pedidos datados no futuro,
-- o limite anti-spam (20 por minuto) ficava estourado para sempre e NENHUM cliente conseguia mais pedir;
-- com data no passado, dava para fugir do limite. O mesmo valia para o log de erros.
-- Este arquivo só troca as três funções dos gatilhos (os gatilhos continuam os mesmos). Seguro rodar mais de uma vez.

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
  end if;

  NEW.status := 'novo';
  NEW.created_at := now(); -- a data também é do servidor (ver limitar_pedidos)
  return NEW;
end $$;

create or replace function public.limitar_pedidos()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  tabela text := TG_TABLE_NAME;
  mesmo_telefone int;
  ultimo_minuto int;
  digitos text := regexp_replace(NEW.client_phone, '\D', '', 'g');
begin
  -- A data do pedido é sempre a do servidor. Sem isso, um pedido enviado com data no futuro
  -- ficaria contando para sempre no limite abaixo e travaria os pedidos de todo mundo;
  -- e um com data no passado escaparia do limite. (Este gatilho roda antes dos outros.)
  NEW.created_at := now();

  execute format(
    'select count(*) from public.%I where created_at > now() - interval ''2 minutes''
       and regexp_replace(client_phone, ''\D'', '''', ''g'') = $1', tabela)
    into mesmo_telefone using digitos;
  if mesmo_telefone > 0 then
    raise exception 'Você já enviou um pedido há pouco. Aguarde alguns minutos antes de enviar outro.';
  end if;

  execute format(
    'select count(*) from public.%I where created_at > now() - interval ''1 minute''', tabela)
    into ultimo_minuto;
  if ultimo_minuto >= 20 then
    raise exception 'Muitos pedidos em sequência. Tente novamente em instantes.';
  end if;

  return NEW;
end $$;
revoke execute on function public.limitar_pedidos() from public, anon, authenticated;

create or replace function public.limitar_error_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Data sempre do servidor: com data no futuro, um erro falso travaria o limite abaixo e
  -- ficaria por cima dos erros reais na limpeza dos 2000 mais recentes.
  NEW.created_at := now();
  if (select count(*) from public.error_log where created_at > now() - interval '1 minute') >= 30 then
    return null; -- descarta em silêncio (não vale a pena devolver erro para quem já está com erro)
  end if;
  delete from public.error_log
   where id in (select id from public.error_log order by created_at desc offset 1999);
  return NEW;
end $$;
revoke execute on function public.limitar_error_log() from public, anon, authenticated;

-- Limpeza: pedidos e erros que já tenham entrado com data no futuro (só existem se alguém usou a falha).
-- A margem de 1 dia garante que nenhum pedido real é apagado, seja qual for o fuso do banco.
-- Para conferir antes de rodar: select * from public.orders where created_at > now() + interval '1 day';
delete from public.orders        where created_at > now() + interval '1 day';
delete from public.custom_orders where created_at > now() + interval '1 day';
delete from public.error_log     where created_at > now() + interval '1 day';

insert into public.app_meta (key, value) values ('schema_version', '10')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
