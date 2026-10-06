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

const browser = await launch({ ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--no-sandbox', '--disable-features=OverlayScrollbar'] });
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

const xs = {};
// Navegador com barra de rolagem de verdade (como no Windows); o modo "overlay" esconderia o problema
const btns = page.locator('nav[aria-label="Seções do painel"] button');
const n = await btns.count();
for (let i = 0; i < n; i++) {
  const name = (await btns.nth(i).getAttribute('aria-label')) || String(i);
  await btns.nth(i).click();
  await page.waitForTimeout(400);
  xs[name] = await page.evaluate(() => ({ x: Math.round(document.querySelector('main > div').getBoundingClientRect().x), sb: window.innerWidth - document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
}
const vals = new Set(Object.values(xs).map(v => v.x));
check('barra de rolagem sempre reservada: conteúdo não se desloca entre as abas do painel', vals.size === 1, JSON.stringify(xs));
await browser.close();
process.exit(fails ? 1 : 0);
