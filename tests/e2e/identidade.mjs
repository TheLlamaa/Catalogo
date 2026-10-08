import { BASE, launch } from './env.mjs';

// Identidade da loja: fonte de marca no site todo, cantos extras e modo escuro por padrão.
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const products = [{ id: 'p1', title: 'Vaso', description: 'd', price: 30, stock: 5, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [], sort_order: 1 }];
const browser = await launch();

async function abrir(rows, { dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/site_settings') return json(rows);
    return json([]);
  });
  await page.goto(BASE + '/');
  await page.locator('article').first().waitFor();
  return { page, ctx };
}
const root = (page, prop) => page.evaluate((p) => document.documentElement.style.getPropertyValue(p), prop);

{ // padrão
  const { page, ctx } = await abrir([]);
  check('padrão: sem fonte nem cantos personalizados', (await root(page, '--font-body')) === '' && (await root(page, '--radius-xl')) === '');
  check('padrão: claro', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));
  await ctx.close();
}
{ // fonte de marca e cantos quadrados
  const { page, ctx } = await abrir([{ key: 'fontChoice', value: 'b-poppins' }, { key: 'cardStyle', value: 'quadrado' }]);
  check('fonte de marca vira a fonte do site', (await root(page, '--font-body')).includes('Poppins'), await root(page, '--font-body'));
  check('cantos "Quadrado"', (await root(page, '--radius-xl')) === '0');
  await page.waitForTimeout(500);
  check('arquivo da fonte carregado do próprio site', await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('Poppins')); } catch { return false; } })));
  await ctx.close();
}
{ // escuro por padrão: abre escuro; o cliente troca e a escolha vale
  const { page, ctx } = await abrir([{ key: 'darkMode', value: 'dark' }]);
  check('escuro por padrão: abre escuro mesmo com aparelho claro', await page.evaluate(() => document.documentElement.classList.contains('dark')));
  await page.getByRole('button', { name: /claro|escuro/i }).first().click();
  await page.waitForTimeout(200);
  check('cliente troca para o claro', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));
  await page.reload();
  await page.locator('article').first().waitFor();
  check('e a escolha do cliente continua depois de recarregar', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));
  await ctx.close();
}
{ // sempre claro continua valendo
  const { page, ctx } = await abrir([{ key: 'darkMode', value: 'off' }], { dark: true });
  check('"sempre claro" ignora o aparelho escuro', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
