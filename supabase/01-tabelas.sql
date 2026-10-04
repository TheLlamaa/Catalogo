-- 01 · Tabelas do catálogo.
-- Pode rodar mais de uma vez: só cria o que ainda não existe.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  aura_color  text default 'none',
  created_at  timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  price        numeric not null default 0,
  image_urls   text[] default '{}',
  active       boolean default true,
  category_ids uuid[] default '{}',
  stock        integer default 0,
  aura_color   text default 'none',
  options      jsonb not null default '[]'::jsonb,   -- opções que o cliente escolhe (cor, tamanho…)
  lead_time    text,                                  -- prazo de produção
  created_at   timestamptz not null default timezone('utc', now())
);

-- Pedidos do carrinho
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  client_name      text not null,
  client_phone     text not null,
  items            jsonb not null,
  total            numeric not null,
  status           text default 'novo'
                   check (status in ('novo', 'em_producao', 'enviado', 'concluido', 'cancelado')),
  notes            text,
  delivery_method  text,        -- 'retirada' ou 'entrega'
  delivery_address text,
  created_at       timestamptz not null default timezone('utc', now())
);

-- Pedidos de peça personalizada
create table if not exists public.custom_orders (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  client_phone text not null,
  description  text not null,
  image_url    text,
  status       text default 'novo'
               check (status in ('novo', 'em_producao', 'enviado', 'concluido', 'cancelado')),
  created_at   timestamptz not null default timezone('utc', now())
);

-- Dados que só o admin pode ver (hoje: link do modelo 3D de cada produto).
-- Fica separado de "products" porque o RLS protege linhas, não colunas.
create table if not exists public.product_private (
  product_id uuid primary key references public.products(id) on delete cascade,
  model_url  text check (model_url is null or (model_url ~* '^https?://[^[:space:]]+$' and char_length(model_url) <= 500)),
  updated_at timestamptz not null default now()
);

-- Textos e menus do site, e as auras personalizadas (guardadas como JSON em chaves como "customAuras")
create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[A-Za-z]{1,40}$'),
  value      text not null constraint site_settings_value_len check (char_length(value) <= 5000),
  updated_at timestamptz not null default now()
);

-- Quem administra a loja (e-mails em minúsculas). Gerenciado pela aba "Equipe" do painel.
-- Depois de criar o banco do zero, o primeiro admin entra por SQL: insert into public.admins (email) values ('voce@exemplo.com');
create table if not exists public.admins (
  email      text primary key
             constraint admins_email_valido check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  added_by   text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Versão do banco: o painel avisa quando este banco está atrás da versão que o site espera
create table if not exists public.app_meta (
  key   text primary key,
  value text not null
);
