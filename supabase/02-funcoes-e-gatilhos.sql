-- 02 · Funções e gatilhos (quem é admin, validação e limite de pedidos).
-- Pode rodar mais de uma vez.

-- ATENÇÃO: troque pelos e-mails dos admins (em minúsculas) ANTES de rodar.
-- Este arquivo fica público no GitHub de propósito sem os e-mails reais.
-- Se rodar sem trocar, ninguém será admin (o painel não abre), mas nada fica exposto.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'seu-email-admin-1@exemplo.com',
    'seu-email-admin-2@exemplo.com'
  )
$$;

-- Validação dos pedidos (só no INSERT, para não travar a edição de pedidos antigos).
-- Também força status = 'novo': o visitante nunca escolhe o status.
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
  return NEW;
end $$;

-- Anti-spam: mesmo telefone só 1 pedido a cada 2 minutos; no máximo 20 por minuto no total.
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

-- Funções internas dos gatilhos: não precisam (nem devem) ser chamáveis de fora pela API.
revoke execute on function public.limitar_pedidos() from public, anon, authenticated;

drop trigger if exists validar_orders on public.orders;
create trigger validar_orders before insert on public.orders
  for each row execute function public.validar_pedido();

drop trigger if exists limitar_orders on public.orders;
create trigger limitar_orders before insert on public.orders
  for each row execute function public.limitar_pedidos();

drop trigger if exists validar_custom_orders on public.custom_orders;
create trigger validar_custom_orders before insert on public.custom_orders
  for each row execute function public.validar_pedido();

drop trigger if exists limitar_custom_orders on public.custom_orders;
create trigger limitar_custom_orders before insert on public.custom_orders
  for each row execute function public.limitar_pedidos();
