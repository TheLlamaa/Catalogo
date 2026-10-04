import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const P3 = '33333333-3333-4333-8333-333333333333';
const product = (id, title) => ({ id, title, description: 'x', price: 55, stock: 5, active: true, image_urls: [], category_ids: [], options: [], created_at: '2026-01-01T00:00:00Z' });
const products = [product(P1, 'Morcego Amigurumi'), product(P2, 'Peça Sem Modelo'), product(P3, 'Peça Link Ruim')];
const privates = [{ product_id: P1, model_url: 'https://files.example.com/morcego.stl' }, { product_id: P3, model_url: 'javascript:alert(1)' }];
const item = (id, title) => ({ id, title, price: 55, quantity: 1, imageUrls: [] });
const orders = [{
  id: 'a1000000-0000-0000-0000-000000000000', client_name: 'Maria Silva', client_phone: '(48) 99999-7777', total: 220,
  created_at: new Date(Date.now() - 3600000).toISOString(), status: 'novo', delivery_method: 'retirada',
  items: [item(P1, 'Morcego Amigurumi'), item(P2, 'Peça Sem Modelo'), item(P3, 'Peça Link Ruim'), item('99999999-9999-4999-8999-999999999999', 'Produto Apagado')],
}];

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

async function abrir(browser, settings = []) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (req.method() !== 'GET') return json([]);
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/product_private') return json(privates);
    if (url.pathname === '/rest/v1/orders') return json(orders);
    if (url.pathname === '/rest/v1/site_settings') return json(settings);
    return json([]);
  });
  await page.goto(BASE + '/admin');
  await page.getByTestId('resumo-pedidos').waitFor();
  await page.locator('div.cursor-pointer').first().click();
  await page.getByRole('dialog').waitFor();
  return { page, ctx };
}

const browser = await launch();

{ // recurso ligado (padrão do nicho 3D)
  const { page, ctx } = await abrir(browser);
  const dialog = page.getByRole('dialog');
  const links = dialog.getByRole('link', { name: 'Abrir modelo' });
  check('só o item com modelo válido mostra "Abrir modelo"', await links.count() === 1);
  check('link aponta para o modelo e abre em outra aba com rel seguro',
    await links.getAttribute('href') === 'https://files.example.com/morcego.stl' && await links.getAttribute('target') === '_blank' && /noopener/.test(await links.getAttribute('rel')));
  check('link de modelo inválido (javascript:) não aparece', await dialog.locator('a[href^="javascript"]').count() === 0);
  check('item de produto apagado continua listado, sem link', await dialog.getByText('Produto Apagado').count() === 1);
  await ctx.close();
}

{ // recurso desligado no painel: nenhum link
  const { page, ctx } = await abrir(browser, [{ key: 'modelLinkEnabled', value: 'false' }]);
  check('com "Link do modelo 3D" desligado não mostra o link', await page.getByRole('dialog').getByRole('link', { name: 'Abrir modelo' }).count() === 0);
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
