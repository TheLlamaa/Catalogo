import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const orders = Array.from({ length: 32 }, (_, i) => ({
  id: `a${String(i).padStart(7, '0')}-0000-0000-0000-000000000000`, client_name: `Cliente ${String(i + 1).padStart(2, '0')}`,
  client_phone: `(48) 99999-${String(1000 + i)}`, total: 10 + i, created_at: hoursAgo(i + 1), status: i % 4 === 0 ? 'concluido' : 'novo',
  delivery_method: 'retirada', items: [{ id: 'p1', title: 'Peça', price: 10 + i, quantity: 1, imageUrls: [] }],
}));
const customOrders = Array.from({ length: 12 }, (_, i) => ({
  id: `k${String(i).padStart(7, '0')}-0000-0000-0000-000000000000`, client_name: `Custom ${String(i + 1).padStart(2, '0')}`, client_phone: '(48) 91111-2222',
  description: `Pedido ${i + 1}`, image_url: '', created_at: hoursAgo(i + 1), status: 'novo',
}));

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const page = await ctx.newPage();
page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/orders' && req.method() === 'GET') return json(orders);
  if (url.pathname === '/rest/v1/custom_orders' && req.method() === 'GET') return json(customOrders);
  return json([]);
});

await page.goto(BASE + '/admin');
await page.getByTestId('resumo-pedidos').waitFor();
const cards = () => page.locator('div.cursor-pointer').count();
const nav = page.getByRole('navigation', { name: 'Paginação' });

check('32 pedidos: mostra 10 por página (padrão)', await cards() === 10);
check('rodapé informa o intervalo', await nav.getByText('Mostrando 1–10 de 32 pedidos').count() === 1);
check('resumo continua somando todos (não só a página)', (await page.getByTestId('resumo-pedidos').innerText()).includes('32'));
check('página 1: "anterior" desligado', await nav.getByRole('button', { name: 'Página anterior' }).isDisabled());

await nav.getByRole('button', { name: 'Próxima página' }).click();
check('próxima página: 11–20', await nav.getByText('Mostrando 11–20 de 32 pedidos').count() === 1 && await cards() === 10);
check('página atual marcada', await nav.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current') === 'page');

await nav.getByRole('button', { name: 'Página 4' }).click();
check('última página tem 2 pedidos', await cards() === 2 && await nav.getByText('Mostrando 31–32 de 32 pedidos').count() === 1);
check('última página: "próxima" desligado', await nav.getByRole('button', { name: 'Próxima página' }).isDisabled());

await nav.getByLabel('Por página').selectOption('20');
check('trocar para 20 por página volta à página 1', await cards() === 20 && await nav.getByText('Mostrando 1–20 de 32 pedidos').count() === 1);
check('escolha fica lembrada no navegador', await page.evaluate(() => localStorage.getItem('catalogo-pedidos-por-pagina')) === '20');

await nav.getByRole('button', { name: 'Página 2' }).click();
await page.getByPlaceholder(/Buscar/).fill('Cliente 05');
await page.waitForTimeout(300);
check('filtrar volta à página 1 e mostra só o resultado', await cards() === 1 && await nav.getByText('Mostrando 1–1 de 1 pedidos').count() === 1);
check('com 1 página não mostra botões de página', await nav.getByRole('button', { name: 'Página 1' }).count() === 0);

await page.reload();
await page.getByTestId('resumo-pedidos').waitFor();
check('depois de recarregar continua com 20 por página', await cards() === 20);

// paginação também no topo
const topo = page.getByRole('navigation', { name: 'Páginas, topo da lista' });
await page.getByPlaceholder(/Buscar/).fill('');
await page.waitForTimeout(300);
check('topo: mostra o mesmo intervalo', await topo.getByText('Mostrando 1–20 de 32 pedidos').count() === 1);
await topo.getByRole('button', { name: 'Página 2' }).click();
check('topo: trocar de página vale para a lista toda', await nav.getByText('Mostrando 21–32 de 32 pedidos').count() === 1 && await cards() === 12);
await topo.getByLabel('Por página').selectOption('10');
check('topo: itens por página também funciona (e o rodapé acompanha)', await cards() === 10 && await nav.getByLabel('Por página').inputValue() === '10');

// modo lista
const linhas = () => page.locator('tr[data-order-row]').count();
check('começa em cards (sem tabela)', await page.getByTestId('lista-pedidos').count() === 0);
await page.getByRole('button', { name: 'Lista' }).click();
check('modo lista mostra a tabela com 10 linhas', await linhas() === 10 && await page.getByRole('columnheader', { name: 'Cliente' }).count() === 1);
check('modo lista não usa cards', await cards() === 0);
check('escolha da visão fica lembrada', await page.evaluate(() => localStorage.getItem('catalogo-pedidos-visao')) === 'lista');
await nav.getByRole('button', { name: 'Próxima página' }).click();
check('modo lista: paginação continua funcionando', await linhas() === 10 && await nav.getByText('Mostrando 11–20 de 32 pedidos').count() === 1);
await page.reload();
await page.getByTestId('lista-pedidos').waitFor();
check('depois de recarregar continua em lista', await linhas() === 10);
await page.locator('tr[data-order-row]').first().click();
await page.getByRole('dialog').waitFor();
check('clicar na linha abre o detalhe do pedido', await page.getByRole('dialog').getByText(/Detalhes da Compra/).count() === 1);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Cards' }).click();
check('voltar para cards', await cards() === 10 && await page.getByTestId('lista-pedidos').count() === 0);

// pedidos personalizados
await page.getByRole('button', { name: /^Personalizados/ }).click();
await page.getByText('Custom 01').waitFor();
check('custom: usa as mesmas escolhas (10 por página, cards)', await cards() === 10);
await page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: 'Página 2' }).click();
check('custom: página 2 tem 2', await cards() === 2);
await page.getByRole('button', { name: 'Lista' }).click();
check('custom: modo lista (mesma escolha das duas abas)', await linhas() === 2);

await browser.close();
process.exit(fails ? 1 : 0);
