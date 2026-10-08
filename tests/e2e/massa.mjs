import { BASE, launch } from './env.mjs';

// Edição em massa de produtos: marcar, escolher a ação, confirmar e conferir o que foi gravado.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const P = (id, title, price, extra = {}) => ({ id, title, description: '', price, stock: 5, active: true, category_ids: ['geral'], image_urls: [], aura_color: 'inherit', created_at: '2026-09-30T10:00:00Z', options: [], sort_order: 0, discount_percent: 0, ...extra });
const products = [P('p1', 'Vaso Alto', 30), P('p2', 'Vaso Baixo', 50), P('p3', 'Luminária', 20, { active: false })];
const categories = [{ id: 'geral', name: 'Geral', slug: 'geral', aura_color: 'none', sort_order: 1 }, { id: 'vasos', name: 'Vasos', slug: 'vasos', aura_color: 'none', sort_order: 2 }];

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));

const patches = [];
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/rpc/is_admin') return json(true);
  if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
  if (url.pathname === '/rest/v1/products') {
    if (req.method() === 'PATCH') { patches.push({ id: url.searchParams.get('id'), body: JSON.parse(req.postData()) }); return route.fulfill({ status: 204, headers: cors, body: '' }); }
    return json(products);
  }
  if (url.pathname === '/rest/v1/categories') return json(categories);
  return json([]);
});

await page.goto(BASE + '/admin');
await page.getByRole('button', { name: /^Produtos/ }).first().click();
await page.getByLabel('Marcar Vaso Alto').waitFor();
check('sem seleção, a barra de edição em massa não aparece', await page.getByRole('region', { name: 'Edição em massa' }).count() === 0);

async function aplicar(acao, { valor, categoria } = {}) {
  await page.getByLabel('Ação para os produtos marcados').selectOption(acao);
  if (valor !== undefined) await page.getByLabel('Porcentagem').fill(valor);
  if (categoria) await page.getByLabel('Categoria', { exact: true }).selectOption(categoria);
  await page.getByRole('region', { name: 'Edição em massa' }).getByRole('button', { name: 'Aplicar' }).click();
}

// reajuste de preço em 2 produtos
await page.getByLabel('Marcar Vaso Alto').check();
await page.getByLabel('Marcar Vaso Baixo').check();
check('a barra mostra quantos estão marcados', await page.getByText('2 produtos marcados').isVisible());
await aplicar('price', { valor: '10' });
const dlg = page.getByRole('dialog', { name: /Alterar 2 produtos/ });
await dlg.waitFor();
check('a confirmação mostra o exemplo do reajuste', (await dlg.innerText()).includes('R$') && (await dlg.innerText()).includes('+10%'));
await dlg.getByRole('button', { name: 'Aplicar' }).click();
await page.waitForTimeout(500);
const price = (id) => patches.find(p => p.id === `eq.${id}`)?.body;
check('PATCH com o preço novo: 30 -> 33 e 50 -> 55', price('p1')?.price === 33 && price('p2')?.price === 55, JSON.stringify(patches));
check('produto não marcado não é alterado', !price('p3'));
check('a seleção é limpa depois de aplicar', await page.getByRole('region', { name: 'Edição em massa' }).count() === 0);

// cancelar a confirmação não grava nada
patches.length = 0;
await page.getByLabel('Marcar Vaso Alto').check();
await aplicar('hide');
const dlg2 = page.getByRole('dialog', { name: /Alterar 1 produto/ });
await dlg2.waitFor();
await dlg2.getByRole('button', { name: /Cancelar/ }).click();
await page.waitForTimeout(300);
check('cancelar a confirmação não grava nada', patches.length === 0);

// adicionar à categoria: sai de "Geral"
await aplicar('cat-add', { categoria: 'vasos' });
await page.getByRole('dialog', { name: /Alterar 1 produto/ }).getByRole('button', { name: 'Aplicar' }).click();
await page.waitForTimeout(500);
check('adicionar à categoria troca "Geral" pela nova', JSON.stringify(price('p1')?.category_ids) === JSON.stringify(['vasos']), JSON.stringify(patches));

// marcar todos da lista
await page.getByLabel(/Marcar todos os 3 produtos/).check();
check('"marcar todos" marca a lista inteira', await page.getByText('3 produtos marcados').isVisible());
await page.getByRole('button', { name: 'Limpar seleção' }).click();
check('limpar seleção esconde a barra', await page.getByRole('region', { name: 'Edição em massa' }).count() === 0);

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
