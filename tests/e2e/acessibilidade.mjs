// Acessibilidade (WCAG 2.1 AA) com axe-core: vitrine e painel, computador e celular.
// Também confere alvos de toque (mínimo 24 px, WCAG 2.2) no celular.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { BASE, launch } from './env.mjs';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const STORAGE = 'https://mock.supabase.co/storage/v1/object/public/fotos_produtos';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };
const P = (id, title, extra = {}) => ({ id, title, description: 'Peça impressa em PLA.', price: 30, stock: 5, active: true, category_ids: ['c1'],
  image_urls: [`${STORAGE}/${id}.jpg`], aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [{ name: 'Cor', values: ['Branco', 'Preto'] }],
  lead_time: 'Pronta entrega', badge: null, section: null, sort_order: Number(id.slice(1)), ...extra });
const products = [P('p1', 'Vaso Cubo', { badge: 'Novo', section: 'destaque' }), P('p2', 'Chaveiro Gato', { stock: 2 }), P('p3', 'Luminária', { stock: 0 }), P('p4', 'Sem Foto', { image_urls: [] })];
const categories = [{ id: 'c1', name: 'Vasos', slug: 'vasos', description: '', aura_color: 'none', sort_order: 1 }];
const orders = [{ id: 'a1b2c3d4-0000-0000-0000-000000000001', client_name: 'Maria', client_phone: '(48) 99999-7777', total: 60, created_at: '2026-10-01T12:00:00Z', status: 'novo',
  delivery_method: 'retirada', items: [{ id: 'p1', title: 'Vaso Cubo', price: 30, quantity: 2, options: { Cor: 'Branco' }, imageUrls: [] }] }];
const customOrders = [{ id: 'k1', client_name: 'Carla', client_phone: '(21) 97777-2222', description: 'Suporte para controle', image_url: '', created_at: '2026-10-01T12:00:00Z', status: 'novo' }];

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await launch();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function abrir(path, { mobile = false, admin = false } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1300, height: 900 } });
  if (admin) await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/orders') return json(orders);
    if (url.pathname === '/rest/v1/custom_orders') return json(customOrders);
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
    return json([]);
  });
  await page.goto(BASE + path);
  await page.waitForTimeout(700);
  return { page, ctx };
}

async function axe(page, name) {
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }))
    .violations.map(x => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target.join(' ')}`));
  check(`${name}: sem violações WCAG 2.1 AA`, v.length === 0, v.join(' | '));
}

async function alvos(page, name) {
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]), [role=switch]')]
    .filter(e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      if (!b.width || !b.height || cs.visibility === 'hidden' || e.classList.contains('sr-only') || e.closest('[aria-hidden=true]')) return false;
      if (e.matches('input[type=checkbox],input[type=radio]') && e.closest('label')) return false;
      return Math.min(b.width, b.height) < 24; })
    .map(e => (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30)));
  check(`${name}: alvos de toque com pelo menos 24 px`, small.length === 0, small.join(' | '));
}

for (const mobile of [false, true]) {
  const tag = mobile ? 'celular' : 'computador';
  let { page, ctx } = await abrir('/', { mobile });
  await axe(page, `vitrine (${tag})`); if (mobile) await alvos(page, 'vitrine (celular)');
  await page.getByText('Vaso Cubo').first().click(); await page.getByRole('dialog').waitFor();
  await axe(page, `janela do produto (${tag})`);
  await ctx.close();
  ({ page, ctx } = await abrir('/custom', { mobile })); await axe(page, `peça personalizada (${tag})`); await ctx.close();

  ({ page, ctx } = await abrir('/admin', { mobile, admin: true }));
  await axe(page, `painel: pedidos (${tag})`); if (mobile) await alvos(page, 'painel: pedidos (celular)');
  const ir = async (label) => {
    if (mobile) { await page.getByRole('button', { name: /Abrir menu do painel/ }).click(); }
    const scope = mobile ? page.getByRole('dialog', { name: 'Menu do painel' }) : page.locator('nav[aria-label="Seções do painel"]');
    await scope.getByRole('button', { name: new RegExp(`^${label}( \\(|$)`) }).first().click();
    await page.waitForTimeout(300);
  };
  await ir('Produtos'); await axe(page, `painel: produtos (${tag})`); if (mobile) await alvos(page, 'painel: produtos (celular)');
  await page.getByRole('button', { name: 'Editar Vaso Cubo' }).click(); await axe(page, `painel: formulário de produto (${tag})`);
  await page.getByRole('button', { name: /Voltar para a lista/ }).click();
  await ir('Categorias'); await axe(page, `painel: categorias (${tag})`);
  await ir('Personalizados'); await axe(page, `painel: personalizados (${tag})`);
  await ir('Página inicial'); await axe(page, `painel: página inicial (${tag})`);
  await ir('Pedidos e carrinho'); await axe(page, `painel: pedidos e carrinho (${tag})`);
  await ir('Calculadora de preço'); await axe(page, `painel: calculadora de preço (${tag})`); if (mobile) await alvos(page, 'painel: calculadora (celular)');
  await ctx.close();
}

{ // teclado: menu do celular prende o foco e devolve ao botão
  const { page, ctx } = await abrir('/admin', { mobile: true, admin: true });
  const botao = page.getByRole('button', { name: /Abrir menu do painel/ });
  await botao.click();
  let dentro = true;
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); dentro &&= await page.evaluate(() => !!document.querySelector('[role=dialog]')?.contains(document.activeElement)); }
  check('teclado: Tab fica dentro do menu do celular', dentro);
  await page.keyboard.press('Escape');
  check('teclado: Esc fecha o menu e o foco volta ao botão', await page.getByRole('dialog').count() === 0 && await botao.evaluate(b => b === document.activeElement));
  await ctx.close();
}
{ // teclado: atalho "Pular para o conteúdo"
  const { page, ctx } = await abrir('/');
  await page.keyboard.press('Tab');
  check('teclado: primeiro Tab mostra "Pular para o conteúdo"', (await page.evaluate(() => document.activeElement?.textContent)) === 'Pular para o conteúdo');
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
process.exit(failed.length ? 1 : 0);
