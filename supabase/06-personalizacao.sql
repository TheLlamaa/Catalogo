-- Personalização da vitrine: selo, seção (Destaques / Mais pedidos) e ordem manual.
-- Pode ser rodado mais de uma vez. Rode ANTES de usar essas opções no painel.

alter table public.products
  add column if not exists badge      text,
  add column if not exists section    text,
  add column if not exists sort_order integer not null default 0;

alter table public.categories
  add column if not exists sort_order integer not null default 0;

-- Selo curto e seção só com os valores que o site conhece
alter table public.products drop constraint if exists products_badge_len;
alter table public.products add constraint products_badge_len check (badge is null or char_length(badge) <= 20);

alter table public.products drop constraint if exists products_section_valida;
alter table public.products add constraint products_section_valida check (section is null or section in ('destaque', 'popular'));

notify pgrst, 'reload schema';
