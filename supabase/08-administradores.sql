-- 08 · Administradores em tabela (em vez de e-mails dentro da função) e versão do banco.
-- Para quem já tem o banco funcionando: este arquivo PEGA os e-mails que estão hoje na função is_admin()
-- e os copia para a tabela public.admins, e só depois troca a função. Seguro rodar mais de uma vez.
-- Depois disso, quem é admin passa a ser gerenciado pela aba "Equipe" do painel (não precisa mais mexer em SQL).

create table if not exists public.admins (
  email      text primary key
             constraint admins_email_valido check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  added_by   text,
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.app_meta (
  key   text primary key,
  value text not null
);

do $$
declare
  def text;
  m text[];
  formato_antigo boolean;
begin
  -- 1) copia os e-mails da função antiga (ignora os e-mails de exemplo do repositório)
  begin
    select pg_get_functiondef('public.is_admin()'::regprocedure) into def;
  exception when undefined_function then
    def := '';
  end;
  formato_antigo := def ~ 'in \(\s*''';
  if formato_antigo then
    for m in select regexp_matches(def, '''([^'' @]+@[^'' @]+\.[^'' @]+)''', 'g') loop
      if m[1] !~* '@exemplo\.com$' then
        insert into public.admins (email, added_by) values (lower(m[1]), 'migração 08') on conflict do nothing;
      end if;
    end loop;
  end if;

  -- 2) trava de segurança: se a função antiga tinha e-mails de verdade mas nada foi copiado, para tudo (nada muda)
  if formato_antigo and def !~* '@exemplo\.com' and not exists (select 1 from public.admins) then
    raise exception 'Não consegui copiar os e-mails da função is_admin(). Nada foi alterado. Insira os admins manualmente: insert into public.admins (email) values (''voce@exemplo.com''); e rode este arquivo de novo.';
  end if;
end $$;

-- 3) função nova (lê a tabela) e proteção contra ficar sem admin
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

-- 4) regras de acesso das tabelas novas
alter table public.admins   enable row level security;
alter table public.app_meta enable row level security;

drop policy if exists "admins leitura" on public.admins;
create policy "admins leitura" on public.admins
  for select to authenticated using (public.is_admin());
drop policy if exists "admins adiciona" on public.admins;
create policy "admins adiciona" on public.admins
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins remove" on public.admins;
create policy "admins remove" on public.admins
  for delete to authenticated using (public.is_admin());
revoke all on public.admins from anon;
revoke update on public.admins from authenticated;

drop policy if exists "app_meta admin le" on public.app_meta;
create policy "app_meta admin le" on public.app_meta
  for select to authenticated using (public.is_admin());
revoke all on public.app_meta from anon;
revoke insert, update, delete on public.app_meta from authenticated;

-- 5) versão do banco (só sobe, nunca desce)
insert into public.app_meta (key, value) values ('schema_version', '8')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
