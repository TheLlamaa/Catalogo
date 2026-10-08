"""Testes do banco: aplica os arquivos supabase/[0-9]*.sql num Postgres local e confere políticas, gatilhos e preços.
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
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;""")
# estado "antigo" do banco do usuário: políticas abertas que existiam
cur.execute("""create table public.categories (id uuid primary key default gen_random_uuid(), name text);
alter table public.categories enable row level security;
create policy "Permitir tudo em categorias" on public.categories for all to public using (true) with check (true);""")
files=sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '[0-9]*.sql')))
for rep in (1,2):
    for f in files:
        sql=open(f,encoding='utf-8').read()
        ok,m=att(sql)
        if rep==1 or not ok: check(f'{os.path.basename(f)} (execução {rep})',ok,m)
    if rep==1:
        ok,m=att("insert into public.admins (email, added_by) values ('admin@teste.com','teste')"); check('primeiro admin entra por SQL',ok,m)
check('2ª execução de todos os arquivos sem erro', True)
cur.execute("select policyname from pg_policies where schemaname='public' order by 1"); pol=[r[0] for r in cur.fetchall()]
check('política aberta antiga foi removida', 'Permitir tudo em categorias' not in pol, str(pol))
cur.execute("select count(*) from pg_policies where schemaname in ('public','storage')"); n=cur.fetchone()[0]
check('quantidade de políticas = 21 (18 public + 3 storage)', n==21, str(n))
cur.execute("select tgname from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('orders','custom_orders','public.orders','public.custom_orders') order by 1"); tg=[r[0] for r in cur.fetchall()]
check('9 gatilhos criados', tg==['baixa_estoque_orders','estoque_status_orders','limitar_custom_orders','limitar_orders','opcoes_orders','precificar_orders','promocao_orders','validar_custom_orders','validar_orders'], str(tg))
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
role('authenticated','seu-email-admin-2@exemplo.com'); cur.execute("select public.is_admin()"); check('e-mail de exemplo NÃO é admin (nada vem pré-configurado)', cur.fetchone()[0] is False)

cur.execute("select column_name from information_schema.columns where table_schema='public' and ((table_name='products' and column_name in ('badge','section','sort_order')) or (table_name='categories' and column_name='sort_order'))"); check('colunas novas existem', len(cur.fetchall())==4)
role('authenticated','admin@teste.com'); ok,m=att("update public.products set badge='Novo', section='destaque', sort_order=3 where id=%s",(pid,)); check('admin grava selo, seção e ordem',ok,m)
ok,m=att("update public.products set section='outra' where id=%s",(pid,)); check('seção inválida recusada',not ok,m)
ok,m=att("update public.products set badge=repeat('x',21) where id=%s",(pid,)); check('selo longo demais recusado',not ok,m)
role('anon'); cur.execute("select badge, section, sort_order from public.products where id=%s",(pid,)); check('visitante lê selo/seção/ordem de produto ativo', cur.fetchone()==('Novo','destaque',3))
ok,m=att("update public.products set sort_order=99 where id=%s",(pid,)); cur.execute("reset role"); cur.execute("select sort_order from public.products where id=%s",(pid,)); check('visitante NÃO altera ordem', cur.fetchone()[0]==3)

# --- preço do pedido calculado pelo banco ---
cur.execute("select tgname from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('orders','custom_orders','public.orders','public.custom_orders') order by 1"); tg=[r[0] for r in cur.fetchall()]
check('7 gatilhos criados', tg==['limitar_custom_orders','limitar_orders','opcoes_orders','precificar_orders','promocao_orders','validar_custom_orders','validar_orders'], str(tg))
cur.execute("select tablename from pg_publication_tables where pubname='supabase_realtime' order by 1"); check('tempo real nas 4 tabelas', [r[0] for r in cur.fetchall()]==['categories','custom_orders','orders','products'])
cur.execute("select has_function_privilege('anon','public.limitar_pedidos()','execute')"); check('limitar_pedidos não é chamável pela API', cur.fetchone()[0] is False)


cur.execute("insert into public.products (title, price, active, stock, image_urls) values ('Chaveiro', 60, true, 5, '{https://x/a.jpg,https://x/b.jpg}'), ('Inativo', 10, false, 5, '{}'), ('Sem estoque', 10, true, 0, '{}') returning id"); ids=[r[0] for r in cur.fetchall()]; pid,inat,zero=map(str,ids)
cur.execute("update public.products set title='Chaveiro' where id=%s",(pid,))
def pedido(items,total=0.01,tel='(48) 99999-3333',refill=True):
    # O estoque agora cai a cada pedido (SQL 15): cada teste começa com o produto cheio, salvo refill=False
    if refill: cur.execute('reset role'); cur.execute('update public.products set stock=5 where id=%s',(pid,))
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
ok,m=pedido([{"id":pid,"quantity":3,"options":{"Cor":"Azul"}},{"id":pid,"quantity":3,"options":{"Cor":"Vermelho"}}],tel='(48) 99999-2525'); check('linhas do mesmo produto somam contra o estoque (3+3 > 5) e são recusadas',not ok,m)
ok,m=pedido([{"id":pid,"quantity":3,"options":{"Cor":"Azul"}},{"id":pid,"quantity":2,"options":{"Cor":"Vermelho"}}],tel='(48) 99999-2626'); check('3+2 com estoque 5 é aceito',ok,m)
role('anon'); ok,m=att("select public.precificar_pedido()"); check('função não chamável pela API', not ok, m)
# --- opções do item com tamanho limitado (12) ---
ok,m=pedido([{"id":pid,"quantity":1,"options":{"Cor":"Azul","Tamanho":"G"}}],tel='(48) 99999-1515'); check('opções normais são aceitas', ok, m)
ok,m=pedido([{"id":pid,"quantity":1,"options":{f"o{i}":"x" for i in range(11)}}],tel='(48) 99999-1616'); check('mais de 10 opções num item é recusado', not ok, m)
ok,m=pedido([{"id":pid,"quantity":1,"options":{"Cor":"x"*81}}],tel='(48) 99999-1717'); check('valor de opção gigante é recusado', not ok, m)
ok,m=pedido([{"id":pid,"quantity":1,"options":{"Cor":{"a":1}}}],tel='(48) 99999-1818'); check('opção que não é texto é recusada', not ok, m)
role('anon'); ok,m=att("select public.limitar_opcoes_pedido()"); check('gatilho de opções não chamável pela API', not ok, m)
# --- desconto em % (13) ---
role('authenticated','admin@teste.com'); ok,m=att("update public.products set discount_percent=15 where id=%s",(pid,)); check('admin grava desconto de 15%', ok, m)
ok,m=att("update public.products set discount_percent=95 where id=%s",(pid,)); check('desconto acima de 90% é recusado', not ok, m)
ok,m=att("update public.products set discount_percent=-5 where id=%s",(pid,)); check('desconto negativo é recusado', not ok, m)
ok,m=pedido([{"id":pid,"price":0.01,"quantity":2}],tel='(48) 99999-1919'); t,it=ultimo()
check('pedido com desconto: 2 x 51,00 = 102', ok and float(t)==102.0 and float(it[0]['price'])==51.0, f"{m} {t} {it}")
check('item guarda o preço cheio e o desconto', float(it[0].get('fullPrice',0))==60.0 and it[0].get('discount')==15, str(it))
cur.execute("reset role"); cur.execute("update public.products set price=39.9, discount_percent=15 where id=%s",(pid,))
ok,m=pedido([{"id":pid,"quantity":1}],tel='(48) 99999-1920'); t,it=ultimo(); check('arredonda como o site: 39,90 - 15% = 33,92', ok and float(t)==33.92, f"{m} {t}")
cur.execute("reset role"); cur.execute("update public.products set price=60, discount_percent=0 where id=%s",(pid,))
ok,m=pedido([{"id":pid,"quantity":1}],tel='(48) 99999-1921'); t,it=ultimo(); check('sem desconto: preço cheio e item sem fullPrice', ok and float(t)==60.0 and 'fullPrice' not in it[0], f"{m} {t} {it}")
role('anon'); ok,m=att("select public.aplicar_desconto_pedido()"); check('gatilho de desconto não chamável pela API', not ok, m)
role('anon'); cur.execute("select discount_percent from public.products where id=%s",(pid,)); check('vitrine lê o desconto', cur.fetchone()[0]==0)
# --- categoria oculta (12) ---
cur.execute("reset role"); cur.execute("insert into public.categories (name) values ('Oculta Teste') returning visible"); check('categoria nova nasce visível', cur.fetchone()[0] is True)
role('authenticated','admin@teste.com'); ok,m=att("update public.categories set visible=false where name='Oculta Teste'"); check('admin esconde categoria', ok, m)
role('anon'); cur.execute("select visible from public.categories where name='Oculta Teste'"); check('vitrine lê a categoria com visible=false (para filtrar no site)', cur.fetchone()[0] is False)
ok,m=att("update public.categories set visible=true where name='Oculta Teste'"); cur.execute("reset role"); cur.execute("select visible from public.categories where name='Oculta Teste'"); check('visitante não muda a visibilidade', cur.fetchone()[0] is False)
# --- controle de estoque opcional ---
role('authenticated','admin@teste.com'); ok,m=att("insert into public.site_settings(key,value) values ('stockControl','false') on conflict (key) do update set value=excluded.value"); check('admin desliga o controle de estoque',ok,m)
ok,m=pedido([{"id":pid,"quantity":6}],tel='(48) 99999-2020'); check('controle desligado: aceita quantidade acima do estoque',ok,m)
ok,m=pedido([{"id":zero,"quantity":1}],tel='(48) 99999-2121'); check('controle desligado: aceita produto com estoque 0',ok,m)
ok,m=pedido([{"id":inat,"quantity":1}],tel='(48) 99999-2222'); check('controle desligado: produto inativo continua recusado',not ok,m)
role('authenticated','admin@teste.com'); att("update public.site_settings set value='true' where key='stockControl'")
ok,m=pedido([{"id":pid,"quantity":6}],tel='(48) 99999-2323'); check('controle ligado de novo: volta a recusar',not ok,m)
role('authenticated','admin@teste.com'); att("delete from public.site_settings where key='stockControl'")
ok,m=pedido([{"id":pid,"quantity":6}],tel='(48) 99999-2424'); check('sem a configuração: padrão é controlar estoque',not ok,m)
# --- administradores em tabela ---
role('anon'); ok,m=att("select * from public.admins"); check('visitante não lê a lista de admins', not ok, m)
role('authenticated','outro@x.com'); cur.execute("select count(*) from public.admins"); check('logado que não é admin vê 0 admins', cur.fetchone()[0]==0)
ok,m=att("insert into public.admins(email) values ('invasor@x.com')"); check('não-admin não se adiciona como admin', not ok, m)
role('authenticated','admin@teste.com'); cur.execute("select public.is_admin()"); check('admin da tabela é admin', cur.fetchone()[0] is True)
ok,m=att("insert into public.admins(email, added_by) values ('segundo@teste.com','admin@teste.com')"); check('admin adiciona outro admin', ok, m)
ok,m=att("insert into public.admins(email) values ('MAIUSCULA@teste.com')"); check('e-mail em maiúsculas é recusado', not ok, m)
ok,m=att("insert into public.admins(email) values ('sem-arroba')"); check('e-mail inválido é recusado', not ok, m)
ok,m=att("update public.admins set email='x@teste.com' where email='segundo@teste.com'"); check('não dá para editar admin (só adicionar/remover)', not ok, m)
role('authenticated','segundo@teste.com'); cur.execute("select public.is_admin()"); check('o novo admin já tem acesso', cur.fetchone()[0] is True)
ok,m=att("select count(*) from public.products"); ok2,m2=att("update public.products set stock=stock where false"); check('novo admin consegue usar as tabelas protegidas', ok and ok2, m+m2)
role('authenticated','admin@teste.com'); ok,m=att("delete from public.admins where email='admin@teste.com'"); check('admin não remove o próprio acesso', not ok, m)
ok,m=att("delete from public.admins where email='segundo@teste.com'"); check('admin remove outro admin', ok, m)
role('authenticated','admin@teste.com'); cur.execute("select public.is_admin()"); check('admin removido continua removido; o outro segue admin', cur.fetchone()[0] is True)
role('authenticated','segundo@teste.com'); cur.execute("select public.is_admin()"); check('quem foi removido deixa de ser admin na hora', cur.fetchone()[0] is False)
cur.execute("reset role"); ok,m=att("delete from public.admins where email='admin@teste.com'"); check('nem pelo SQL Editor dá para apagar o último admin', not ok, m)
role('authenticated','admin@teste.com'); cur.execute("select value from public.app_meta where key='schema_version'"); check('admin lê a versão do banco (18)', cur.fetchone()[0]=='18')
ok,m=att("update public.app_meta set value='1' where key='schema_version'"); cur.execute("select value from public.app_meta where key='schema_version'"); check('admin não consegue mexer na versão do banco', cur.fetchone()[0]=='18')
role('anon'); ok,m=att("select * from public.app_meta"); check('visitante não lê a versão', not ok, m)
cur.execute("reset role"); cur.execute("update public.app_meta set value='99' where key='schema_version'")
sql08=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '08-administradores.sql'),encoding='utf-8').read(); att(sql08)
cur.execute("select value from public.app_meta where key='schema_version'"); check('rodar o 08 de novo não faz a versão voltar para trás', cur.fetchone()[0]=='99')

# --- log de erros (09) ---
cur.execute("reset role"); cur.execute("delete from public.error_log")
role('anon'); ok,m=att("insert into public.error_log (source, message, page) values ('window','Boom','/')"); check('visitante registra um erro', ok, m)
ok,m=att("select * from public.error_log"); check('visitante não lê o log de erros', not ok, m)
ok,m=att("insert into public.error_log (source, message) values ('hack','x')"); check('origem inválida é recusada', not ok, m)
ok,m=att("insert into public.error_log (message) values ('')"); check('mensagem vazia é recusada', not ok, m)
ok,m=att("insert into public.error_log (message) values (repeat('a',501))"); check('mensagem gigante é recusada', not ok, m)
role('authenticated','outro@x.com'); cur.execute("select count(*) from public.error_log"); check('logado que não é admin vê 0 erros', cur.fetchone()[0]==0)
role('authenticated','admin@teste.com'); cur.execute("select count(*) from public.error_log"); check('admin vê o erro registrado', cur.fetchone()[0]==1)
ok,m=att("update public.error_log set message='editado'"); check('ninguém edita o log', not ok, m)
role('anon')
for i in range(40): att("insert into public.error_log (message) values (%s)",(f'e{i}',))
role('authenticated','admin@teste.com'); cur.execute("select count(*) from public.error_log"); n=cur.fetchone()[0]; check('limite de 30 erros por minuto', n==30, str(n))
cur.execute("delete from public.error_log"); cur.execute("select count(*) from public.error_log"); check('admin limpa o log', cur.fetchone()[0]==0)


# --- data sempre do servidor (10): o visitante não escolhe o created_at ---
cur.execute("reset role"); cur.execute("delete from public.orders"); cur.execute("delete from public.custom_orders"); cur.execute("delete from public.error_log")
role('anon')
for i in range(3): att("insert into public.orders (client_name, client_phone, items, total, created_at) values ('Spam',%s,%s,0,'2099-01-01')",(f'(48) 99888-000{i}',json.dumps([{"id":pid,"quantity":1}])))
for i in range(3): att("insert into public.custom_orders (client_name, client_phone, description, created_at) values ('Spam',%s,'quero uma peça','2099-01-01')",(f'(48) 99777-000{i}',))
for i in range(3): att("insert into public.error_log (message, created_at) values ('falso','2099-01-01')")
cur.execute("reset role")
cur.execute("select count(*), count(*) filter (where created_at > now() + interval '1 minute') from public.orders"); n,fut=cur.fetchone(); check('pedido com data no futuro entra com a data do servidor', n==3 and fut==0, f'{n} {fut}')
cur.execute("select count(*), count(*) filter (where created_at > now() + interval '1 minute') from public.custom_orders"); n,fut=cur.fetchone(); check('pedido personalizado com data no futuro entra com a data do servidor', n==3 and fut==0, f'{n} {fut}')
cur.execute("select count(*), count(*) filter (where created_at > now() + interval '1 minute') from public.error_log"); n,fut=cur.fetchone(); check('erro com data no futuro entra com a data do servidor', n==3 and fut==0, f'{n} {fut}')
role('anon'); ok,m=att("insert into public.custom_orders (client_name, client_phone, description, created_at) values ('Spam','(48) 99666-0000','quero uma peça','2000-01-01')")
ok2,m2=att("insert into public.custom_orders (client_name, client_phone, description, created_at) values ('Spam','(48) 99666-0000','quero uma peça','2000-01-01')"); check('data no passado não escapa do limite por telefone', ok and not ok2, m+' / '+m2)
# o 10 também limpa o que já tenha entrado com data no futuro (simula a falha com os gatilhos desligados)
cur.execute("reset role"); cur.execute("set session_replication_role = replica")
cur.execute("insert into public.orders (client_name, client_phone, items, total, created_at) values ('Spam','48999990000','[]',0,'2099-01-01')")
cur.execute("insert into public.error_log (message, created_at) values ('falso','2099-01-01')")
cur.execute("set session_replication_role = origin")
sql10=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '10-data-do-servidor.sql'),encoding='utf-8').read(); ok,m=att(sql10)
cur.execute("select (select count(*) from public.orders where created_at > now() + interval '1 day') + (select count(*) from public.error_log where created_at > now() + interval '1 day')"); check('o 10 apaga registros já gravados com data no futuro', ok and cur.fetchone()[0]==0, m)
cur.execute("select count(*) from public.orders"); check('...e mantém os pedidos normais', cur.fetchone()[0]==3)

# --- foto do pedido personalizado só embutida (11) ---
def custom(img, tel):
    role('anon'); return att("insert into public.custom_orders (client_name, client_phone, description, image_url) values ('Cliente',%s,'quero uma peça',%s)",(tel,img))
ok,m=custom('data:image/jpeg;base64,/9j/4AAQSkZJRg==','(48) 99555-0001'); check('foto embutida (jpeg) é aceita', ok, m)
ok,m=custom(None,'(48) 99555-0002'); check('pedido sem foto é aceito', ok, m)
ok,m=custom('','(48) 99555-0003'); check('foto vazia é aceita', ok, m)
ok,m=custom('https://atacante.example/pixel.png','(48) 99555-0004'); check('link externo no lugar da foto é recusado', not ok, m)
ok,m=custom('data:image/svg+xml;base64,PHN2Zz4=','(48) 99555-0005'); check('SVG embutido é recusado', not ok, m)
ok,m=custom('data:image/jpeg;base64,AAAA" onerror="x','(48) 99555-0006'); check('foto com lixo depois do base64 é recusada', not ok, m)


# --- migração de um banco antigo (e-mails dentro da função is_admin) ---
srv2=pgserver.get_server(tempfile.mkdtemp()); conn2=psycopg2.connect(srv2.get_uri()); conn2.autocommit=True; c2=conn2.cursor()
def legacy(emails):
    c2.execute("drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; create schema auth;")
    c2.execute("create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;")
    lista=", ".join(f"'{e}'" for e in emails)
    c2.execute(f"create function public.is_admin() returns boolean language sql stable set search_path = '' as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) in ({lista}) $$;")
def rodar08():
    try: c2.execute(sql08); return True,''
    except Exception as e: return False,str(e).strip().splitlines()[0]
c2.execute("do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;")
legacy(['dono@loja.com','Socio@Loja.com'])
ok,m=rodar08(); check('migração: roda sobre um banco antigo', ok, m)
c2.execute("select email, added_by from public.admins order by 1"); rows=c2.fetchall()
check('migração: copia os e-mails da função antiga (em minúsculas)', rows==[('dono@loja.com','migração 08'),('socio@loja.com','migração 08')], str(rows))
c2.execute("select set_config('request.jwt.claims', %s, false)",(json.dumps({'email':'socio@loja.com'}),)); c2.execute("select public.is_admin()"); check('migração: quem era admin continua sendo', c2.fetchone()[0] is True)
c2.execute("select set_config('request.jwt.claims', %s, false)",(json.dumps({'email':'outro@x.com'}),)); c2.execute("select public.is_admin()"); check('migração: quem não era continua sem acesso', c2.fetchone()[0] is False)
ok,m=rodar08(); c2.execute("select count(*) from public.admins"); check('migração: rodar de novo não duplica', ok and c2.fetchone()[0]==2, m)
legacy(['seu-email-admin-1@exemplo.com','seu-email-admin-2@exemplo.com'])
ok,m=rodar08(); c2.execute("select count(*) from public.admins"); check('migração: e-mails de exemplo do repositório não viram admin', ok and c2.fetchone()[0]==0, m)
legacy(['dono'])  # função antiga com algo que não dá para copiar: tem que parar sem mudar nada
ok,m=rodar08(); c2.execute("select pg_get_functiondef('public.is_admin()'::regprocedure)"); d=c2.fetchone()[0]
check('migração: se não conseguir copiar os e-mails, para com aviso', not ok and 'Nada foi alterado' in m, m)
check('migração: ...e a função antiga continua como estava (ninguém perde acesso)', 'public.admins' not in d and "'dono'" in d)
c2.execute("select to_regclass('public.admins')"); check('migração: ...e nem a tabela fica criada pela metade', c2.fetchone()[0] is None)

# --- baixa automática de estoque (SQL 15) ---
def estoque(): cur.execute('reset role'); cur.execute('select stock from public.products where id=%s',(pid,)); return cur.fetchone()[0]
def status(oid_,st): cur.execute('reset role'); cur.execute('update public.orders set status=%s where id=%s',(st,oid_))
cur.execute('reset role'); cur.execute("update public.site_settings set value='true' where key='stockControl'"); cur.execute("delete from public.site_settings where key='stockControl'")
ok,m=pedido([{"id":pid,"quantity":2}],tel='(48) 99999-3131'); check('pedido aceito baixa o estoque (5 - 2 = 3)', ok and estoque()==3, f"{m} estoque={estoque()}")
cur.execute('reset role'); cur.execute("select id from public.orders where client_phone='(48) 99999-3131'"); oid1=cur.fetchone()[0]
ok,m=pedido([{"id":pid,"quantity":4}],tel='(48) 99999-3232',refill=False); check('pedido acima do que sobrou é recusado e não mexe no estoque', (not ok) and estoque()==3, f"{m} estoque={estoque()}")
status(oid1,'cancelado'); check('cancelar devolve o estoque (3 + 2 = 5)', estoque()==5, str(estoque()))
status(oid1,'cancelado'); check('cancelar de novo não devolve em dobro', estoque()==5, str(estoque()))
status(oid1,'novo'); check('reabrir o pedido tira o estoque de novo (5 - 2 = 3)', estoque()==3, str(estoque()))
status(oid1,'em_producao'); check('mudar entre status ativos não mexe no estoque', estoque()==3, str(estoque()))
ok,m=pedido([{"id":pid,"quantity":2,"options":{"Cor":"Azul"}},{"id":pid,"quantity":1,"options":{"Cor":"Vermelho"}}],tel='(48) 99999-3535',refill=False); check('duas linhas do mesmo produto baixam a soma (3 - 3 = 0)', ok and estoque()==0, f"{m} estoque={estoque()}")
cur.execute('reset role'); cur.execute("insert into public.site_settings(key,value) values ('stockControl','false') on conflict (key) do update set value=excluded.value")
ok,m=pedido([{"id":pid,"quantity":2}],tel='(48) 99999-3434',refill=False); check('controle desligado: aceita e não mexe no estoque', ok and estoque()==0, f"{m} estoque={estoque()}")
cur.execute('reset role'); cur.execute("delete from public.site_settings where key='stockControl'")
role('anon'); ok,m=att('select public.baixar_estoque_pedido()'); check('função de baixa não é chamável pela API', not ok, m)

# --- detalhes do produto (SQL 18) ---
role('authenticated','admin@teste.com')
ok,m=att("update public.products set specs='[{\"n\":\"Altura\",\"v\":\"20cm\"}]'::jsonb, details='[{\"t\":\"Prazo\",\"x\":\"2-7 dias\"}]'::jsonb where id=%s",(pid,)); check('admin grava características e blocos de informação',ok,m)
ok,m=att("update public.products set specs='{\"n\":\"x\"}'::jsonb where id=%s",(pid,)); check('características que não são uma lista são recusadas',not ok,m)
ok,m=att("update public.products set details=(select jsonb_agg(jsonb_build_object('t','a','x','b')) from generate_series(1,7)) where id=%s",(pid,)); check('mais de 6 blocos de informação é recusado',not ok,m)
ok,m=att("update public.products set specs=(select jsonb_agg(jsonb_build_object('n','a','v','b')) from generate_series(1,13)) where id=%s",(pid,)); check('mais de 12 características é recusado',not ok,m)
role('anon'); cur.execute("select specs->0->>'n', details->0->>'t' from public.products where id=%s",(pid,)); row=cur.fetchone(); check('visitante lê as características de produto ativo', row==('Altura','Prazo'), str(row))

import sys
print('TUDO OK' if allok else 'HÁ FALHAS'); sys.exit(0 if allok else 1)
