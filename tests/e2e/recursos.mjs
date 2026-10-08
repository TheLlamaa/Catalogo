import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const products = [
  { id: 'p1', title: 'Vaso Dourado', description: 'Vaso', price: 69, stock: 5, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'gold',
    created_at: '2026-09-30T10:00:00Z', options: [], lead_time: 'Sob encomenda: 3 a 5 dias' },
];
const categories = [{ id: 'c1', name: 'Casa', slug: 'casa', description: 'Itens', aura_color: 'blue' }];

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

async function abrir(browser, settingsRows, { logged = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
  if (logged) await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
  const upserts = [];
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') {
      if (req.method() === 'GET') return json(settingsRows);
      const b = JSON.parse(req.postData() || '[]'); upserts.push(...[].concat(b)); return route.fulfill({ status: 201, headers: cors, body: '' });
    }
    return json([]);
  });
  return { page, ctx, upserts };
}

const off = (...keys) => keys.map(key => ({ key, value: 'false' }));
const browser = await launch();

{ // padrão (loja 3D): tudo ligado
  const { page, ctx } = await abrir(browser, [], { logged: false });
  await page.goto(BASE + '/');
  await page.getByText('Vaso Dourado').first().waitFor();
  check('padrão: prazo aparece no card', await page.getByText('Sob encomenda: 3 a 5 dias').count() >= 1);
  check('padrão: card tem o brilho da aura', await page.locator('.aura').count() >= 1);
  await ctx.close();
}
{ // admin padrão
  const { page, ctx } = await abrir(browser, [], { logged: true });
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: /^Produtos \(/ }).waitFor();
  check('padrão: aba Auras existe', await page.getByRole('button', { name: 'Auras' }).count() === 1);
  await page.getByRole('button', { name: /^Produtos \(/ }).click();
  check('padrão: lista de produtos tem coluna de aura', await page.getByText('Aura (Edição Rápida)').count() === 1);
  await page.getByRole('button', { name: 'Novo produto' }).click();
  check('padrão: formulário tem prazo, aura e link do modelo', await page.getByLabel(/Prazo de produção/).count() === 1 && await page.getByLabel(/Efeito aura próprio/i).count() === 1 && await page.getByLabel(/Link do modelo 3D/).count() === 1);
  await ctx.close();
}
{ // tudo desligado
  const rows = off('aurasEnabled', 'leadTimeEnabled', 'modelLinkEnabled');
  const pub = await abrir(browser, rows);
  await pub.page.goto(BASE + '/');
  await pub.page.getByText('Vaso Dourado').first().waitFor();
  check('desligado: prazo some do card', await pub.page.getByText('Sob encomenda: 3 a 5 dias').count() === 0);
  check('desligado: card sem brilho de aura', await pub.page.locator('.aura').count() === 0);
  await pub.page.locator('article').first().click();
  await pub.page.getByRole('dialog').waitFor();
  check('desligado: prazo some também na página do produto', await pub.page.getByText('Sob encomenda: 3 a 5 dias').count() === 0);
  await pub.ctx.close();

  const adm = await abrir(browser, rows, { logged: true });
  await adm.page.goto(BASE + '/admin');
  await adm.page.getByRole('button', { name: /^Produtos \(/ }).waitFor();
  check('desligado: aba Auras some', await adm.page.getByRole('button', { name: 'Auras' }).count() === 0);
  await adm.page.getByRole('button', { name: /^Produtos \(/ }).click();
  check('desligado: coluna de aura some da lista', await adm.page.getByText('Aura (Edição Rápida)').count() === 0);
  await adm.page.getByRole('button', { name: 'Novo produto' }).click();
  check('desligado: formulário sem prazo, aura e link do modelo', await adm.page.getByLabel(/Prazo de produção/).count() === 0 && await adm.page.getByLabel(/Efeito aura próprio/i).count() === 0 && await adm.page.getByLabel(/Link do modelo 3D/).count() === 0);
  check('desligado: o resto do formulário continua (título, preço)', await adm.page.getByLabel(/Título|Nome/).count() >= 1);
  await adm.page.keyboard.press('Escape');
  await adm.page.getByRole('button', { name: /^Categorias \(/ }).click();
  check('desligado: categorias sem coluna de aura', await adm.page.getByText('Aura padrão').count() === 0);
  await adm.page.getByRole('button', { name: 'Nova categoria' }).click();
  check('desligado: formulário de categoria sem aura', await adm.page.getByText('Efeito de Aura para os Produtos').count() === 0);
  await adm.ctx.close();
}
{ // painel Site > Recursos
  const { page, ctx, upserts } = await abrir(browser, [], { logged: true });
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: 'Avançado', exact: true }).click();
  const labels = ['Controlar estoque', 'Aceitar pedidos personalizados', 'Prazo de produção nos produtos', 'Efeito de aura (brilho) nos cards', 'Link do modelo 3D no cadastro'];
  const found = await Promise.all(labels.map(l => page.getByLabel(l).count()));
  check('aba Recursos lista os 5 recursos', found.every(n => n === 1), found.join());
  check('todos começam ligados na loja 3D', (await Promise.all(labels.map(l => page.getByLabel(l).isChecked()))).every(Boolean));
  await page.getByLabel('Efeito de aura (brilho) nos cards').uncheck();
  await page.getByRole('button', { name: 'Publicar alterações' }).click();
  await page.getByText(/publicad|salv/i).first().waitFor();
  check('publicar grava só o recurso que mudou', upserts.some(r => r.key === 'aurasEnabled' && r.value === 'false') && !upserts.some(r => r.key === 'stockControl'), JSON.stringify(upserts.map(u => u.key)));
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
