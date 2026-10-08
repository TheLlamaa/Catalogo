import { BASE, launch } from './env.mjs';

// Ordem das seções e blocos extras da página inicial (Clássico, Bancada e Vitrine).
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const P = (id, title, extra = {}) => ({ id, title, description: '', price: 30, stock: 5, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'inherit',
  created_at: '2025-01-01T10:00:00Z', options: [], badge: null, section: null, sort_order: Number(id.slice(1)), ...extra });
const products = [P('p1', 'Vaso A', { section: 'destaque' }), P('p2', 'Vaso B', { section: 'popular' }), P('p3', 'Copo C', { category_ids: ['c2'] }), P('p4', 'Vaso D')];
const categories = [{ id: 'c1', name: 'Vasos', slug: 'vasos', aura_color: 'none', sort_order: 1 }, { id: 'c2', name: 'Copos', slug: 'copos', aura_color: 'none', sort_order: 2 }];
const bloco = (o) => JSON.stringify({ k: 'texto', on: true, t: '', x: '', i: '', l: '', b: '', d: [], ...o });

const browser = await launch();
async function abrir(rows) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') return json(rows);
    return json([]);
  });
  await page.goto(BASE + '/');
  await page.locator('article').first().waitFor();
  return { page, ctx };
}
// posição vertical de cada título na página (-1 = não existe)
const ordem = (page, nomes) => page.evaluate((ns) => ns.map(n => {
  const h = [...document.querySelectorAll('h1,h2,h3')].find(e => e.textContent.trim() === n);
  return h ? h.getBoundingClientRect().top + window.scrollY : -1;
}), nomes);

{ // Clássico: sem nada gravado, destaques antes de mais pedidos
  const { page, ctx } = await abrir([]);
  const [d, m] = await ordem(page, ['Destaques', 'Mais pedidos']);
  check('padrão: Destaques vem antes de Mais pedidos', d > 0 && m > d, `${d} ${m}`);
  await ctx.close();
}
{ // Clássico: ordem trocada + bloco extra no topo
  const rows = [{ key: 'homeSections', value: 'extraA,popular,destaque' }, { key: 'blockA', value: bloco({ t: 'Aviso importante', x: 'Entregas até sexta.' }) }];
  const { page, ctx } = await abrir(rows);
  const [b, m, d] = await ordem(page, ['Aviso importante', 'Mais pedidos', 'Destaques']);
  check('bloco extra aparece e a ordem do dono vale', b > 0 && m > b && d > m, `${b} ${m} ${d}`);
  check('texto do bloco aparece', await page.getByText('Entregas até sexta.').count() === 1);
  await ctx.close();
}
{ // Clássico: bloco desligado não aparece
  const { page, ctx } = await abrir([{ key: 'blockA', value: bloco({ t: 'Escondido', x: 'x', on: false }) }]);
  check('bloco desligado não aparece', await page.getByText('Escondido').count() === 0);
  await ctx.close();
}
{ // Bancada: passos antes de categorias
  const rows = [{ key: 'homeLayout', value: 'bancada' }, { key: 'showCategoryTiles', value: 'true' }, { key: 'homeSections', value: 'passos,categorias' }];
  const { page, ctx } = await abrir(rows);
  const [pas, cat] = await ordem(page, ['Como funciona o pedido', 'Por categoria']);
  check('Bancada: passo a passo antes de "Por categoria"', pas > 0 && cat > pas, `${pas} ${cat}`);
  await ctx.close();
}
{ // Bancada padrão: categorias antes dos passos
  const { page, ctx } = await abrir([{ key: 'homeLayout', value: 'bancada' }, { key: 'showCategoryTiles', value: 'true' }]);
  const [pas, cat] = await ordem(page, ['Como funciona o pedido', 'Por categoria']);
  check('Bancada padrão: "Por categoria" antes do passo a passo', cat > 0 && pas > cat, `${pas} ${cat}`);
  await ctx.close();
}
{ // Vitrine: banner e depoimentos
  const rows = [{ key: 'homeLayout', value: 'vitrine' },
    { key: 'blockA', value: bloco({ k: 'banner', t: 'Promoção de verão', x: 'Tudo com desconto', i: 'https://mock.supabase.co/storage/v1/object/public/x/b.jpg', l: '/sobre', b: 'Ver agora' }) },
    { key: 'blockB', value: bloco({ k: 'depoimentos', t: 'Quem comprou', d: [{ n: 'Ana', q: 'Chegou lindo!' }] }) }];
  const { page, ctx } = await abrir(rows);
  check('Vitrine: banner com botão', await page.getByRole('heading', { name: 'Promoção de verão' }).count() === 1 && await page.getByRole('link', { name: 'Ver agora' }).getAttribute('href') === '/sobre');
  check('Vitrine: depoimento com nome', await page.getByText('Chegou lindo!').count() === 1 && await page.getByText('Ana', { exact: true }).count() === 1);
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
