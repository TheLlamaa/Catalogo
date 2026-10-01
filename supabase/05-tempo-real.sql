-- 05 · Tempo real: o painel admin é avisado na hora quando entra pedido novo ou algo muda.
-- Pode rodar mais de uma vez.
do $$
declare t text;
begin
  foreach t in array array['orders', 'custom_orders', 'products', 'categories'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Conferência: devem aparecer as 4 tabelas
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
