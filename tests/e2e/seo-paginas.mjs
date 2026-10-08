import { BASE, launch } from './env.mjs';

// SEO por página: Sobre e páginas extras têm descrição e imagem próprias; sem elas, valem as do site.
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const products = [{ id: 'p1', title: 'Vaso', description: 'd', price: 30, stock: 5, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [], sort_order: 1 }];
const rows = [
  { key: 'seoDescription', value: 'Descrição do site' }, { key: 'seoImage', value: 'https://mock.supabase.co/storage/v1/object/public/x/site.jpg' },
  { key: 'aboutEnabled', value: 'true' }, { key: 'aboutText', value: 'Quem somos.' }, { key: 'aboutSeoDescription', value: 'Conheça a nossa história' },
  { key: 'pageA', value: JSON.stringify({ t: 'Trocas', x: 'Texto', s: 'trocas', p: true, d: 'Como trocar sua peça', m: 'https://mock.supabase.co/storage/v1/object/public/x/trocas.jpg' }) },
  { key: 'pageB', value: JSON.stringify({ t: 'Prazos', x: 'Texto', s: 'prazos', p: true }) },
];

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: Buffer.alloc(1) });
  if (url.pathname === '/rest/v1/products') return json(products);
  if (url.pathname === '/rest/v1/site_settings') return json(rows);
  return json([]);
});
const meta = (sel) => page.evaluate((s) => document.head.querySelector(s)?.getAttribute('content') ?? null, sel);

await page.goto(BASE + '/');
await page.locator('article').first().waitFor();
check('home: descrição e imagem do site', (await meta('meta[name="description"]')) === 'Descrição do site' && (await meta('meta[property="og:image"]')).endsWith('/site.jpg'));

await page.goto(BASE + '/p/trocas');
await page.getByRole('heading', { name: 'Trocas' }).waitFor();
check('página extra: descrição e imagem próprias', (await meta('meta[name="description"]')) === 'Como trocar sua peça' && (await meta('meta[property="og:image"]')).endsWith('/trocas.jpg'));
check('página extra: título com o nome da loja', (await page.title()).startsWith('Trocas |'));

await page.goto(BASE + '/p/prazos');
await page.getByRole('heading', { name: 'Prazos' }).waitFor();
check('página sem SEO próprio usa o do site', (await meta('meta[name="description"]')) === 'Descrição do site' && (await meta('meta[property="og:image"]')).endsWith('/site.jpg'));

await page.goto(BASE + '/sobre');
await page.getByRole('heading', { name: 'Como funciona' }).waitFor();
check('Sobre: descrição própria e imagem do site', (await meta('meta[name="description"]')) === 'Conheça a nossa história' && (await meta('meta[property="og:image"]')).endsWith('/site.jpg'));

// volta para a home: metatags do site de novo
await page.getByRole('link', { name: /Voltar para a loja/ }).click();
await page.locator('article').first().waitFor();
await page.waitForTimeout(200);
check('ao voltar para a home, as metatags do site voltam', (await meta('meta[name="description"]')) === 'Descrição do site');

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
