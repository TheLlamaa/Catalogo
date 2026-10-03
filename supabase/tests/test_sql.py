"""Testes do banco: aplica os arquivos supabase/0*.sql num Postgres local e confere políticas, gatilhos e preços.
Rodar: pip install pgserver psycopg2-binary && python supabase/tests/test_sql.py"""
import pgserver, psycopg2, tempfile, json, glob, os
allok=True
def check(n,c,e=''):
    global allok; allok&=bool(c); print(('OK   ' if c else 'FAIL ')+n+(f' — {e}' if e else ''))
srv=pgserver.get_server(tempfile.mkdtemp()); conn=psycopg2.connect(srv.get_uri()); conn.autocommit=True; cur=conn.cursor()
def att(q,p=None):
    try: cur.execute(q,p); return True,''
    except Exception as e: return False,str(e).strip().splitlines()[0]
def role(r,email=None):
    cur.execute("reset role"); cur.execute("select set_config('request.jwt.claims', %s, false)",(json.dumps({'email':email} if email else {}),)); cur.execute(f"set role {r}")
# ambiente mínimo parecido com o Supabase
cur.execute("""create role anon nologin; create role authenticated nologin; create schema auth; create schema storage;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;""")
# estado "antigo" do banco do usuário: políticas abertas que existiam
cur.execute("""create table public.categories (id uuid primary key default gen_random_uuid(), name text);
alter table public.categories enable row level security;
create policy "Permitir tudo em categorias" on public.categories for all to public using (true) with check (true);""")
files=sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '0*.sql')))
for rep in (1,2):
    for f in files:
        sql=open(f,encoding='utf-8').read().replace("'seu-email-admin-1@exemplo.com'","'admin@teste.com'")
        ok,m=att(sql)
        if rep==1 or not ok: check(f'{os.path.basename(f)} (execução {rep})',ok,m)
check('2ª execução de todos os arquivos sem erro', True)
cur.execute("select policyname from pg_policies where schemaname='public' order by 1"); pol=[r[0] for r in cur.fetchall()]
check('política aberta antiga foi removida', 'Permitir tudo em categorias' not in pol, str(pol))
cur.execute("select count(*) from pg_policies where schemaname in ('public','storage')"); n=cur.fetchone()[0]
check('quantidade de políticas = 14 (11 public + 3 storage)', n==14, str(n))
cur.execute("select tgname from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('orders','custom_orders','public.orders','public.custom_orders') order by 1"); tg=[r[0] for r in cur.fetchall()]
check('5 gatilhos criados', tg==['limitar_custom_orders','limitar_orders','precificar_orders','validar_custom_orders','validar_orders'], str(tg))
cur.execute("select tablename from pg_publication_tables where pubname='supabase_realtime' order by 1"); check('tempo real nas 4 tabelas', [r[0] for r in cur.fetchall()]==['categories','custom_orders','orders','products'])
cur.execute("select has_function_privilege('anon','public.limitar_pedidos()','execute')"); check('limitar_pedidos não é chamável pela API', cur.fetchone()[0] is False)
# comportamento
cur.execute("insert into public.products (title, active, stock) values ('Ativo', true, 5), ('Inativo', false, 5) returning id"); pid=cur.fetchone()[0]
role('anon')
cur.execute("select count(*) from public.products"); check('visitante vê só produto ativo', cur.fetchone()[0]==1)
ok,m=att("insert into public.orders (client_name, client_phone, items, total, delivery_method) values ('Maria','(48) 99999-1111','[{\"id\":\"" + str(pid) + "\",\"quantity\":1}]',10,'retirada')"); check('visitante cria pedido válido', ok, m)
role('anon'); cur.execute("select count(*) from public.orders"); check('visitante NÃO lê pedidos', cur.fetchone()[0]==0)
ok,m=att("insert into public.orders (client_name, client_phone, items, total) values ('João','(48) 99999-2222','[{\"id\":\"" + str(pid) + "\",\"quantity\":1}]',10)"); ok2,m2=att("insert into public.orders (client_name, client_phone, items, total) values ('João','123','[{\"id\":\"" + str(pid) + "\",\"quantity\":1}]',10)"); check('telefone inválido é recusado', not ok2, m2)
role('anon'); ok,m=att("insert into public.orders (client_name, client_phone, items, total) values ('Maria','(48) 99999-1111','[{\"id\":\"" + str(pid) + "\",\"quantity\":1}]',10)"); check('mesmo telefone em seguida é barrado (anti-spam)', not ok, m)
role('anon'); ok,m=att("insert into public.product_private(product_id, model_url) values (%s,'https://x.com')",(pid,)); check('visitante não acessa product_private', not ok, m)
ok,m=att("update public.site_settings set value='x'"); role('anon'); ok,m=att("insert into public.site_settings(key,value) values ('a','b')"); check('visitante não grava site_settings', not ok, m)
role('authenticated','admin@teste.com')
cur.execute("select count(*) from public.orders"); check('admin lê pedidos', cur.fetchone()[0]>=1)
ok,m=att("insert into public.product_private(product_id, model_url) values (%s,'https://makerworld.com/m/1')",(pid,)); check('admin grava link do modelo', ok, m)
ok,m=att("insert into storage.objects(bucket_id,name) values ('fotos_produtos','a.jpg')"); check('admin envia foto', ok, m)
role('authenticated','outro@x.com'); ok,m=att("insert into storage.objects(bucket_id,name) values ('fotos_produtos','b.jpg')"); check('não-admin não envia foto', not ok, m)
role('authenticated','seu-email-admin-2@exemplo.com'); cur.execute("select public.is_admin()"); check('e-mail genérico do arquivo ainda dá acesso a quem usar (por isso deve ser trocado) — aqui só confirmamos que funciona', cur.fetchone()[0] is True)

cur.execute("select column_name from information_schema.columns where table_schema='public' and ((table_name='products' and column_name in ('badge','section','sort_order')) or (table_name='categories' and column_name='sort_order'))"); check('colunas novas existem', len(cur.fetchall())==4)
role('authenticated','admin@teste.com'); ok,m=att("update public.products set badge='Novo', section='destaque', sort_order=3 where id=%s",(pid,)); check('admin grava selo, seção e ordem',ok,m)
ok,m=att("update public.products set section='outra' where id=%s",(pid,)); check('seção inválida recusada',not ok,m)
ok,m=att("update public.products set badge=repeat('x',21) where id=%s",(pid,)); check('selo longo demais recusado',not ok,m)
role('anon'); cur.execute("select badge, section, sort_order from public.products where id=%s",(pid,)); check('visitante lê selo/seção/ordem de produto ativo', cur.fetchone()==('Novo','destaque',3))
ok,m=att("update public.products set sort_order=99 where id=%s",(pid,)); cur.execute("reset role"); cur.execute("select sort_order from public.products where id=%s",(pid,)); check('visitante NÃO altera ordem', cur.fetchone()[0]==3)

# --- preço do pedido calculado pelo banco ---
cur.execute("select tgname from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('orders','custom_orders','public.orders','public.custom_orders') order by 1"); tg=[r[0] for r in cur.fetchall()]
check('5 gatilhos criados', tg==['limitar_custom_orders','limitar_orders','precificar_orders','validar_custom_orders','validar_orders'], str(tg))
cur.execute("select tablename from pg_publication_tables where pubname='supabase_realtime' order by 1"); check('tempo real nas 4 tabelas', [r[0] for r in cur.fetchall()]==['categories','custom_orders','orders','products'])
cur.execute("select has_function_privilege('anon','public.limitar_pedidos()','execute')"); check('limitar_pedidos não é chamável pela API', cur.fetchone()[0] is False)


cur.execute("insert into public.products (title, price, active, stock, image_urls) values ('Chaveiro', 60, true, 5, '{https://x/a.jpg,https://x/b.jpg}'), ('Inativo', 10, false, 5, '{}'), ('Sem estoque', 10, true, 0, '{}') returning id"); ids=[r[0] for r in cur.fetchall()]; pid,inat,zero=map(str,ids)
cur.execute("update public.products set title='Chaveiro' where id=%s",(pid,))
def pedido(items,total=0.01,tel='(48) 99999-3333'):
    role('anon'); return att("insert into public.orders (client_name, client_phone, items, total, delivery_method) values ('Cliente',%s,%s,%s,'retirada')",(tel,json.dumps(items),total))
def ultimo():
    role('authenticated','admin@teste.com'); cur.execute("select total, items from public.orders order by created_at desc limit 1"); return cur.fetchone()
ok,m=pedido([{"id":pid,"title":"FALSO","price":0.01,"quantity":2,"options":{"Cor":"Azul"},"imageUrls":["http://evil/x.png"]}]); t,it=ultimo()
check('preço adulterado é corrigido: total 120', ok and float(t)==120.0, f"{t} {it}")
check('título/preço/foto vêm do produto', it[0]['title']=='Chaveiro' and float(it[0]['price'])==60 and it[0]['imageUrls']==['https://x/a.jpg'], str(it))
check('opções do cliente são mantidas', it[0]['options']=={'Cor':'Azul'})
ok,m=pedido([{"id":inat,"quantity":1}],tel='(48) 99999-4444'); check('produto inativo recusado',not ok,m)
ok,m=pedido([{"id":zero,"quantity":1}],tel='(48) 99999-5555'); check('produto sem estoque recusado',not ok,m)
ok,m=pedido([{"id":pid,"quantity":6}],tel='(48) 99999-6666'); check('quantidade acima do estoque recusada',not ok,m)
ok,m=pedido([{"id":"00000000-0000-0000-0000-000000000000","quantity":1}],tel='(48) 99999-7777'); check('produto inexistente recusado',not ok,m)
ok,m=pedido([{"id":"nao-e-uuid","quantity":1}],tel='(48) 99999-8888'); check('id inválido recusado',not ok,m)
ok,m=pedido([{"id":pid,"quantity":-1}],tel='(48) 99999-1212'); check('quantidade negativa recusada',not ok,m)
ok,m=pedido("texto",tel='(48) 99999-1313'); check('items que não é lista recusado',not ok,m)
ok,m=pedido([{"id":pid,"quantity":1},{"id":pid,"quantity":2}],tel='(48) 99999-1414'); t,_=ultimo(); check('linhas repetidas somam: 180', ok and float(t)==180.0, f"{t}")
role('anon'); ok,m=att("select public.precificar_pedido()"); check('função não chamável pela API', not ok, m)
import sys
print('TUDO OK' if allok else 'HÁ FALHAS'); sys.exit(0 if allok else 1)
