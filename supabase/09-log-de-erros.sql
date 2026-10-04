-- 09 · Log de erros do site. Quando algo quebra no navegador de um visitante, o site anota aqui
-- (mensagem, página, navegador) e o painel mostra na aba "Erros". Sem serviço externo, sem conta nova.
-- Seguro rodar mais de uma vez.

create table if not exists public.error_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  source     text not null default 'window'
             constraint error_log_source_valida check (source in ('window', 'promise', 'react')),
  message    text not null constraint error_log_message_tamanho check (char_length(message) between 1 and 500),
  stack      text constraint error_log_stack_tamanho check (stack is null or char_length(stack) <= 4000),
  page       text constraint error_log_page_tamanho check (page is null or char_length(page) <= 300),
  user_agent text constraint error_log_ua_tamanho check (user_agent is null or char_length(user_agent) <= 300)
);
create index if not exists error_log_created_at_idx on public.error_log (created_at desc);

-- Anti-abuso: no máximo 30 erros por minuto e 2000 guardados (apaga os mais antigos).
create or replace function public.limitar_error_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.error_log where created_at > now() - interval '1 minute') >= 30 then
    return null; -- descarta em silêncio (não vale a pena devolver erro para quem já está com erro)
  end if;
  delete from public.error_log
   where id in (select id from public.error_log order by created_at desc offset 1999);
  return NEW;
end $$;
revoke execute on function public.limitar_error_log() from public, anon, authenticated;

drop trigger if exists limitar_error_log on public.error_log;
create trigger limitar_error_log before insert on public.error_log
  for each row execute function public.limitar_error_log();

alter table public.error_log enable row level security;

drop policy if exists "error_log visitante registra" on public.error_log;
create policy "error_log visitante registra" on public.error_log
  for insert to anon, authenticated with check (true);
drop policy if exists "error_log admin le" on public.error_log;
create policy "error_log admin le" on public.error_log
  for select to authenticated using (public.is_admin());
drop policy if exists "error_log admin apaga" on public.error_log;
create policy "error_log admin apaga" on public.error_log
  for delete to authenticated using (public.is_admin());
revoke update on public.error_log from anon, authenticated;
revoke select, delete on public.error_log from anon;

insert into public.app_meta (key, value) values ('schema_version', '9')
  on conflict (key) do update set value = excluded.value
  where public.app_meta.value ~ '^[0-9]+$' and public.app_meta.value::int < excluded.value::int;

notify pgrst, 'reload schema';
