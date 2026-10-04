import fs from 'node:fs';

import { BASE, launch } from './env.mjs';
const STORAGE = 'https://mock.supabase.co/storage/v1/object/public/fotos_produtos';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const products = [
  { id: 'p1', title: 'Vaso Ondulado', description: 'Vaso', price: 69, stock: 5, active: true, category_ids: ['c1'],
    image_urls: [`${STORAGE}/a.jpg`, `${STORAGE}/b.jpg`], aura_color: 'inherit', created_at: '2026-09-30T10:00:00Z',
    options: [{ name: 'Cor', values: ['Branco', 'Preto'] }], lead_time: 'Pronta entrega' },
];
const categories = [{ id: 'c1', name: 'Casa', slug: 'casa', description: 'Itens', aura_color: 'none' }];
const orders = [
  { id: 'o1', client_name: 'Maria Silva', client_phone: '(48) 99999-7777', total: 138, created_at: '2026-09-30T12:00:00Z', status: 'novo',
    notes: 'Prefiro azul', delivery_method: 'entrega', delivery_address: 'Rua A, 10, Centro',
    items: [{ id: 'p1', title: 'Vaso Ondulado', price: 69, quantity: 2, options: { Cor: 'Preto' }, imageUrls: [`${STORAGE}/a.jpg`] }] },
  { id: 'o2', client_name: 'João (pedido antigo)', client_phone: '(11) 98888-1111', total: 29, created_at: '2026-09-20T12:00:00Z',
    items: [{ id: 'p2', title: 'Suporte', price: 29, quantity: 1, imageUrls: [] }] }, // sem status/notes/entrega: formato antigo
];
const customOrders = [
  { id: 'k1', client_name: '=cmd|calc', client_phone: '(21) 97777-2222', description: '=HYPERLINK("http://x")', image_url: '', created_at: '2026-09-29T12:00:00Z', status: 'novo' },
];

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, acceptDownloads: true });
await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));

const patches = []; const upserts = []; const privReqs = []; const privateRows = [{ product_id: 'p1', model_url: 'https://makerworld.com/models/1' }];
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
  if (url.pathname === '/rest/v1/products') {
    if (req.method() === 'GET') return json(products);
    const b = JSON.parse(req.postData()); upserts.push(b); return json({ id: b.id || 'new1' }, 201);
  }
  if (url.pathname === '/rest/v1/product_private') {
    privReqs.push({ method: req.method(), query: url.search, body: req.postData() ? JSON.parse(req.postData()) : null });
    return req.method() === 'GET' ? json(privateRows) : route.fulfill({ status: 204, headers: cors, body: '' });
  }
  if (url.pathname === '/rest/v1/categories') return json(categories);
  if (url.pathname === '/rest/v1/orders') {
    if (req.method() === 'GET') return json(orders);
    if (req.method() === 'PATCH') { patches.push({ table: 'orders', id: url.searchParams.get('id'), body: JSON.parse(req.postData()) }); return route.fulfill({ status: 204, headers: cors, body: '' }); }
    if (req.method() === 'DELETE') return route.fulfill({ status: 204, headers: cors, body: '' });
  }
  if (url.pathname === '/rest/v1/custom_orders') return req.method() === 'GET' ? json(customOrders) : route.fulfill({ status: 204, headers: cors, body: '' });
  return json([]);
});

await page.goto(BASE + '/admin');
await page.getByRole('button', { name: /^Pedidos \(2\)/ }).waitFor({ timeout: 10000 });
check('painel abre com a sessão e lista os pedidos', true);
check('selo de pedidos novos na aba (só o novo conta; o antigo sem status também é "novo")', (await page.getByRole('button', { name: /^Pedidos \(2\)/ }).textContent()).includes('2'));

// filtro por status
await page.getByRole('button', { name: /^Todos \(2\)/ }).waitFor();
await page.getByRole('button', { name: /^Em produção \(0\)/ }).click();
check('filtro "Em produção" esconde pedidos novos', await page.getByText('Nenhum pedido com estes filtros.').isVisible());
await page.getByRole('button', { name: /^Todos \(2\)/ }).click();

// mudar status pelo cartão
await page.locator('select[aria-label="Status do pedido"]').first().selectOption('em_producao');
await page.waitForTimeout(300);
check('mudar status envia PATCH {status} para o pedido certo', patches.length === 1 && patches[0].body.status === 'em_producao' && patches[0].id === 'eq.o1', JSON.stringify(patches[0]));
check('contagem dos filtros acompanha a mudança', await page.getByRole('button', { name: /^Em produção \(1\)/ }).isVisible());

// exportar CSV
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Planilha de pedidos' }).click()]);
const csv = fs.readFileSync(await dl.path(), 'utf8');
check('CSV com BOM, separador ";" e itens com opção', csv.startsWith('\ufeff"Código";"Data";"Cliente"') && csv.includes('2x Vaso Ondulado (Cor: Preto)') && csv.includes('"Em produção"'), dl.suggestedFilename());
check('CSV traz entrega e observação; pedido antigo não quebra', csv.includes('Rua A, 10, Centro') && csv.includes('Prefiro azul') && csv.includes('João (pedido antigo)'));

// modal do pedido: detalhes e Esc
await page.getByText('Maria Silva').first().click();
const dlg = page.getByRole('dialog', { name: /Detalhes da Compra/ });
await dlg.waitFor();
check('modal mostra opção, entrega e observação', await dlg.getByText('Cor: Preto').isVisible() && await dlg.getByText('Rua A, 10, Centro').isVisible() && await dlg.getByText('Prefiro azul').isVisible());
await dlg.getByRole('button', { name: /Excluir Pedido/ }).click();
await page.getByRole('dialog', { name: 'Excluir pedido' }).waitFor();
await page.keyboard.press('Escape');
check('Esc fecha só a confirmação (o pedido continua aberto)', await page.getByRole('dialog', { name: 'Excluir pedido' }).count() === 0 && await dlg.isVisible());
await page.keyboard.press('Escape');
await dlg.waitFor({ state: 'detached' });
check('segundo Esc fecha o modal do pedido', true);

// CSV injection (pedidos personalizados)
await page.getByRole('button', { name: /^Pedidos Custom/ }).click();
const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()]);
const csv2 = fs.readFileSync(await dl2.path(), 'utf8');
check('CSV neutraliza fórmulas digitadas por clientes (=…)', csv2.includes(`"'=cmd|calc"`) && csv2.includes(`"'=HYPERLINK`));

// produtos: duplicar
await page.getByRole('button', { name: /^Produtos/ }).click();
await page.getByRole('button', { name: 'Duplicar Vaso Ondulado' }).click();
await page.waitForTimeout(400);
const dup = upserts[0] || {};
const dupPriv = privReqs.find(r => r.method === 'POST');
check('duplicar copia o link do modelo para o novo produto', dupPriv?.body?.model_url === 'https://makerworld.com/models/1' && dupPriv?.body?.product_id === 'new1', JSON.stringify(dupPriv));
check('lista do admin mostra "Abrir modelo" com o link', (await page.getByRole('link', { name: 'Abrir modelo' }).getAttribute('href')) === 'https://makerworld.com/models/1');
privReqs.length = 0;
check('duplicar cria cópia inativa, sem id, com opções e prazo', dup.title === 'Vaso Ondulado (cópia)' && dup.active === false && !('id' in dup) && dup.options?.[0]?.name === 'Cor' && dup.lead_time === 'Pronta entrega', JSON.stringify({ title: dup.title, active: dup.active, id: dup.id }));

// produtos: editar, reordenar fotos, opções
await page.getByRole('button', { name: 'Editar Vaso Ondulado' }).click();
await page.getByRole('heading', { name: 'Editar Produto' }).waitFor();
check('formulário carrega opções e prazo', (await page.getByLabel('Valores da opção').inputValue()) === 'Branco, Preto' && (await page.getByLabel(/Prazo de produção/).inputValue()) === 'Pronta entrega');
await page.getByRole('button', { name: 'Mover para a direita' }).first().click({ force: true });
await page.getByRole('button', { name: 'Adicionar opção' }).click();
await page.getByLabel('Nome da opção').nth(1).fill('Tamanho');
await page.getByRole('button', { name: 'Salvar Alterações' }).click();
await page.getByText(/valor/).first().waitFor({ timeout: 2000 }).catch(() => {});
check('opção sem valor é recusada com aviso', await page.getByText(/Cada opção precisa de um nome e de ao menos um valor/).isVisible());
await page.getByLabel('Valores da opção').nth(1).fill('P, M, G, M');
await page.getByLabel(/Prazo de produção/).fill('Sob encomenda: 5 a 7 dias');
check('formulário carrega o link do modelo', (await page.getByLabel(/Link do modelo 3D/).inputValue()) === 'https://makerworld.com/models/1');
await page.getByLabel(/Link do modelo 3D/).fill('javascript:alert(1)');
const beforeBad = upserts.length;
await page.getByRole('button', { name: 'Salvar Alterações' }).click();
await page.waitForTimeout(300);
check('link inválido é recusado e nada é enviado', upserts.length === beforeBad && await page.getByText(/precisa começar com http/).isVisible());
await page.getByLabel(/Link do modelo 3D/).fill('https://drive.google.com/file/d/abc');
privReqs.length = 0;
const before = upserts.length;
await page.getByRole('button', { name: 'Salvar Alterações' }).click();
await page.waitForTimeout(500);
const saved = upserts[before] || {};
check('salvar envia opções (sem repetidos), prazo e fotos reordenadas', saved.options?.[1]?.name === 'Tamanho' && JSON.stringify(saved.options?.[1]?.values) === '["P","M","G"]' && saved.lead_time === 'Sob encomenda: 5 a 7 dias' && saved.image_urls?.[0]?.endsWith('/b.jpg') && saved.id === 'p1', JSON.stringify({ opts: saved.options, imgs: saved.image_urls?.map(u => u.split('/').pop()) }));
const priv = privReqs.find(r => r.method === 'POST');
check('salvar novo link grava em product_private', priv?.body?.product_id === 'p1' && priv?.body?.model_url === 'https://drive.google.com/file/d/abc', JSON.stringify(priv));
check('o link NÃO vai junto com os dados públicos do produto', !JSON.stringify(saved).includes('drive.google'));
check('formulário fecha depois de salvar com sucesso', await page.getByRole('heading', { name: /Produtos Cadastrados/ }).isVisible());

// limpar link => DELETE
await page.getByRole('button', { name: 'Editar Vaso Ondulado' }).click();
await page.getByLabel(/Link do modelo 3D/).fill('');
privReqs.length = 0;
await page.getByRole('button', { name: 'Salvar Alterações' }).click();
await page.waitForTimeout(500);
check('limpar o link faz DELETE em product_private do produto certo', privReqs.some(r => r.method === 'DELETE' && r.query.includes('product_id=eq.p1')), JSON.stringify(privReqs));

// edição rápida (ativo/inativo) não mexe no link
privReqs.length = 0;
await page.getByRole('button', { name: /^Ativo$/ }).click();
await page.waitForTimeout(400);
check('edição rápida não escreve em product_private', !privReqs.some(r => r.method !== 'GET'), JSON.stringify(privReqs));

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
process.exit(failed.length ? 1 : 0);
