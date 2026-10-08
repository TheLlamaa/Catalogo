// Logo e nome da loja no topo (Site > Aparência > Logo / Nome da loja no topo): fonte carregada do próprio site,
// tamanho, cor, maiúsculas, formato da logo, frase, imagem no lugar do nome e tamanhos de celular.
import { BASE, launch } from './env.mjs';

const STORAGE = 'https://mock.supabase.co/storage/v1/object/public/fotos_produtos';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };
const browser = await launch();
const fontRequests = [];

async function open(extra, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
  page.on('request', r => { if (/\.woff2?$/.test(r.url())) fontRequests.push(r.url()); });
  const settings = Object.entries(extra).map(([key, value]) => ({ key, value }));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(url.pathname === '/rest/v1/site_settings' ? settings : []) });
  });
  await page.goto(BASE + '/');
  await page.locator('header a[href="/"]').waitFor();
  await page.waitForTimeout(600);
  return { page, ctx };
}
const nameStyle = (page) => page.locator('header a[href="/"] span span span').first().evaluate(el => {
  const c = getComputedStyle(el); return { text: el.textContent, font: c.fontFamily, size: c.fontSize, weight: c.fontWeight, transform: c.textTransform, color: c.color, italic: c.fontStyle };
});

{
  const { page, ctx } = await open({});
  const st = await nameStyle(page);
  check('padrão: nome em 18 px e negrito', st.size === '18px' && st.weight === '700', JSON.stringify(st));
  check('link do topo tem nome acessível', (await page.locator('header a[href="/"]').getAttribute('aria-label')).includes('página inicial'));
  await ctx.close();
}
{
  const { page, ctx } = await open({ nameFont: 'orbitron', nameSize: '28', nameWeight: '900', nameCase: 'maiusculas', nameItalic: 'true', nameColorMode: 'personalizada', nameColor: '#c2410c', storeTagline: 'Impressão 3D sob medida' });
  const st = await nameStyle(page);
  check('fonte escolhida aplicada', st.font.includes('Orbitron'), st.font);
  check('tamanho, espessura, maiúsculas, itálico e cor', st.size === '28px' && st.weight === '900' && st.transform === 'uppercase' && st.italic === 'italic' && st.color === 'rgb(194, 65, 12)', JSON.stringify(st));
  check('arquivo da fonte vem do próprio site', fontRequests.some(u => u.startsWith(BASE) && /orbitron/i.test(u)), fontRequests.join(' '));
  check('frase abaixo do nome', await page.locator('header').getByText('Impressão 3D sob medida').count() === 1);
  await ctx.close();
}
{
  const { page, ctx } = await open({ logoUrl: `${STORAGE}/logo.png`, logoShape: 'redondo', logoSize: '96', logoSizeMobile: '56', brandLayout: 'abaixo' }, 390);
  const img = page.locator('header a[href="/"] img').first();
  const box = await img.boundingBox();
  check('celular usa o tamanho de celular da logo', Math.round(box.height) === 56, String(box.height));
  check('logo redonda é quadrada e com cantos totais', Math.round(box.width) === 56 && (await img.evaluate(e => getComputedStyle(e).borderRadius)).startsWith('9999'));
  check('nome embaixo da logo', await page.locator('header a[href="/"] > span').evaluate(e => getComputedStyle(e).flexDirection) === 'column');
  check('celular sem rolagem para o lado', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await ctx.close();
}
{
  const { page, ctx } = await open({ nameImage: `${STORAGE}/nome.png`, nameImageSize: '40' });
  const imgs = page.locator('header a[href="/"] img');
  check('imagem no lugar do nome', await imgs.count() === 1 && (await imgs.first().getAttribute('src')).endsWith('nome.png'));
  check('altura da imagem do nome', Math.round((await imgs.first().boundingBox()).height) === 40);
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
