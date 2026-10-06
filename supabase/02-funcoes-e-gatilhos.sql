-- 02 · Funções e gatilhos (quem é admin, validação e limite de pedidos).
-- Pode rodar mais de uma vez.

-- Admin = e-mail que está na tabela public.admins (a aba "Equipe" do painel gerencia isso).
-- security definer: precisa ler a tabela mesmo quando quem pergunta é um visitante.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- Protege contra ficar sem ninguém no comando: não dá para remover o próprio acesso nem o último admin.
create or replace function public.proteger_admins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) = OLD.email then
    raise exception 'Você não pode remover o seu próprio acesso.';
  end if;
  if (select count(*) from public.admins) <= 1 then
    raise exception 'Precisa existir pelo menos um administrador.';
  end if;
  return OLD;
end;
$$;
revoke execute on function public.proteger_admins() from public, anon, authenticated;

drop trigger if exists proteger_admins on public.admins;
create trigger proteger_admins before delete on public.admins
  for each row execute function public.proteger_admins();

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
  NEW.created_at := now(); -- a data também é do servidor (ver limitar_pedidos)
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

-- Preço do pedido calculado pelo banco: o navegador só diz QUAL produto e QUANTOS;
-- título, preço, foto e total vêm da tabela products (impede mandar preço adulterado).
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

  NEW.items := novos;
  NEW.total := soma;
  return NEW;
end;
$$;

revoke execute on function public.precificar_pedido() from public, anon, authenticated;

drop trigger if exists precificar_orders on public.orders;
create trigger precificar_orders before insert on public.orders
  for each row execute function public.precificar_pedido();
