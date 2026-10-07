// Modelos da página inicial (Site > Página inicial > Modelo): Vitrine e Bancada montam a capa, filtram,
// buscam e adicionam ao orçamento; o Clássico continua igual.
import { BASE, launch } from './env.mjs';

const STORAGE = 'https://mock.supabase.co/storage/v1/object/public/fotos_produtos';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const P = (id, title, price, cats, extra = {}) => ({ id, title, description: `Descrição de ${title}`, price, stock: 5, active: true, category_ids: cats,
  image_urls: [`${STORAGE}/${id}.jpg`], aura_color: 'inherit', created_at: '2026-01-10T10:00:00Z', options: [], lead_time: null, section: null, ...extra });
const products = [
  P('p1', 'Vaso Espiral', 89.9, ['c1'], { section: 'destaque' }),
  P('p2', 'Luminária Lua', 149, ['c2'], { section: 'destaque', options: [{ name: 'Tamanho', values: ['12 cm', '15 cm'] }] }),
  P('p3', 'Porta-canetas', 34.9, ['c3']),
  ...Array.from({ length: 14 }, (_, i) => P(`x${i}`, `Peça extra ${i + 1}`, 10 + i, ['c1'])),
];
const categories = [
  { id: 'c1', name: 'Vasos', slug: 'vasos', description: 'Vasos e cachepôs', aura_color: 'none' },
  { id: 'c2', name: 'Luminárias', slug: 'luminarias', description: 'Luz', aura_color: 'none' },
  { id: 'c3', name: 'Escritório', slug: 'escritorio', description: 'Mesa', aura_color: 'none' },
  { id: 'c4', name: 'Vazia', slug: 'vazia', description: '', aura_color: 'none' },
];

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };
const browser = await launch();

async function open(layout, { width = 1280, extra = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
  const settings = [{ key: 'homeLayout', value: layout }, { key: 'catalogTitle', value: 'Título da loja' }, ...Object.entries(extra).map(([key, value]) => ({ key, value }))];
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') return json(settings);
    return json([]);
  });
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  return { page, ctx };
}
const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const cartCount = (page) => page.getByRole('button', { name: /Abrir orçamento/ }).textContent();

for (const layout of ['vitrine', 'bancada', 'mista']) {
  const { page, ctx } = await open(layout);
  check(`${layout}: título da loja na capa`, (await page.getByRole('heading', { level: 1 }).textContent()).includes('Título da loja'));
  check(`${layout}: categoria sem produto não aparece`, await page.getByRole('button', { name: /^Vazia/ }).count() === 0);
  check(`${layout}: mostra 12 e oferece "Ver mais"`, await page.getByRole('button', { name: /^Ver mais 5 peças/ }).count() === 1);

  // Adicionar direto (produto sem opções) e "Escolher opções" abre a janela do produto
  const add = layout !== 'bancada' ? page.getByRole('button', { name: 'Adicionar ao orçamento: Porta-canetas' }) : page.getByRole('article', { name: 'Ver detalhes de Porta-canetas' }).getByRole('button', { name: /Adicionar/ });
  await add.click();
  await page.waitForTimeout(200);
  check(`${layout}: adiciona ao orçamento pelo card`, (await cartCount(page)).includes('1 item'), await cartCount(page));
  if (await page.locator('[role="presentation"].fixed').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  const opts = layout !== 'bancada' ? page.getByRole('button', { name: 'Escolher opções: Luminária Lua' }) : page.getByRole('article', { name: 'Ver detalhes de Luminária Lua' }).getByRole('button', { name: 'Escolher opções' });
  await opts.first().click();
  await page.getByRole('dialog').waitFor({ timeout: 5000 }).catch(() => {});
  check(`${layout}: produto com opções abre a janela`, await page.getByRole('dialog').count() === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Filtro por categoria vai para o endereço e esconde a capa
  await page.getByRole('button', { name: /^Luminárias/ }).first().click();
  await page.waitForTimeout(200);
  check(`${layout}: categoria no endereço`, page.url().includes('categoria=luminarias'), page.url());
  check(`${layout}: categoria mostra só os seus produtos`, await page.getByRole('article').count() === 1);
  check(`${layout}: título vira o nome da categoria`, (await page.getByRole('heading', { level: 1 }).textContent()).includes('Luminárias'));

  // Busca sem resultado: mensagem e botão para limpar
  await page.goto(BASE + '/?q=xyzzy');
  await page.getByText('Nada encontrado').waitFor();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await page.waitForTimeout(200);
  check(`${layout}: limpar busca volta à vitrine`, !page.url().includes('q='), page.url());
  await ctx.close();

  const m = await open(layout, { width: 390 });
  check(`${layout}: celular sem rolagem para o lado`, await noHorizontalScroll(m.page));
  await m.ctx.close();
}

// Passo a passo da Bancada (a loja de teste tem WhatsApp configurado)
{
  const { page, ctx } = await open('bancada');
  check('bancada: passo a passo com 3 etapas', await page.locator('#como-pedir + ol > li').count() === 3);
  check('bancada: com WhatsApp, o passo 3 cita WhatsApp', await page.getByText('Combine pelo WhatsApp').count() === 1);
  await ctx.close();
}
// "Por categoria" com fotos: escondido por padrão, aparece quando ligado; atalhos da capa sem contagem
for (const layout of ['bancada', 'mista']) {
  const off = await open(layout);
  check(`${layout}: "Por categoria" escondido por padrão`, await off.page.getByRole('heading', { name: 'Por categoria' }).count() === 0);
  const chips = await off.page.getByRole('navigation', { name: 'Atalhos de categoria' }).getByRole('button').allTextContents();
  check(`${layout}: atalhos da capa sem quantidade`, chips.length === 3 && chips.every(t => !/\d/.test(t)), JSON.stringify(chips));
  check(`${layout}: uma busca só na capa (sem id repetido)`, await off.page.locator('#busca').count() === 1);
  await off.ctx.close();
  const on = await open(layout, { extra: { showCategoryTiles: 'true' } });
  check(`${layout}: "Por categoria" aparece quando ligado`, await on.page.getByRole('heading', { name: 'Por categoria' }).count() === 1);
  await on.ctx.close();
}
// Vitrine + Bancada com categoria escolhida: capa some e a busca vai para a barra das abas
{
  const { page, ctx } = await open('mista');
  await page.goto(BASE + '/?categoria=vasos');
  await page.getByRole('heading', { level: 1, name: /Vasos/ }).waitFor();
  check('mista: com categoria, busca na barra das abas', await page.locator('#busca').count() === 1 && await page.locator('#titulo-loja').count() === 0);
  check('mista: aba da categoria marcada', (await page.locator('nav[aria-label="Categorias"] [aria-current="page"]').textContent()).includes('Vasos'));
  await ctx.close();
}
// Faixa "Peça personalizada": em todos os modelos, liga/desliga e muda de lugar
const band = (page) => page.getByRole('heading', { level: 2, name: 'Peça Personalizada' });
for (const layout of ['classico', 'vitrine', 'bancada', 'mista']) {
  const on = await open(layout);
  check(`${layout}: faixa "Peça personalizada" aparece por padrão`, await band(on.page).count() === 1);
  await on.ctx.close();
  const off = await open(layout, { extra: { showCustomBand: 'false' } });
  check(`${layout}: faixa some quando desligada`, await band(off.page).count() === 0);
  await off.ctx.close();
}
{
  const { page, ctx } = await open('vitrine', { extra: { customBandRows: 'inicio' } });
  const first = await page.locator('#pecas .grid > *').first().textContent();
  check('faixa antes dos produtos quando escolhido', first.includes('Peça Personalizada'), first.slice(0, 60));
  await ctx.close();
}
// Blocos da capa e textos do passo a passo editáveis
{
  const { page, ctx } = await open('mista', { extra: { showHeroCategories: 'false', showCategoryTabs: 'false', stepOneTitle: 'Monte seu pedido', howTitle: 'Do jeito que funciona' } });
  check('mista: atalhos da capa desligados', await page.getByRole('navigation', { name: 'Atalhos de categoria' }).count() === 0);
  check('mista: abas desligadas', await page.getByRole('navigation', { name: 'Categorias' }).count() === 0);
  check('mista: título e passo editados', await page.getByRole('heading', { name: 'Do jeito que funciona' }).count() === 1 && await page.getByText('Monte seu pedido').count() === 1);
  await ctx.close();
}
{
  const { page, ctx } = await open('bancada', { extra: { showHowItWorks: 'false' } });
  check('bancada: passo a passo desligado', await page.locator('#como-pedir').count() === 0);
  await ctx.close();
}
{
  const { page, ctx } = await open('vitrine', { extra: { showHeroMosaic: 'false' } });
  check('vitrine: capa sem o mosaico', await page.locator('section[aria-labelledby="titulo-loja"] img').count() === 0);
  await ctx.close();
}
// Imagem de capa do painel substitui o mosaico da Vitrine
{
  const { page, ctx } = await open('vitrine', { extra: { heroImage: `${STORAGE}/capa.png` } });
  const capa = await page.locator('section[aria-labelledby="titulo-loja"] img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src')));
  check('vitrine: imagem de capa no lugar do mosaico', capa.length === 1 && capa[0].endsWith('capa.png'), JSON.stringify(capa));
  await ctx.close();
}
// Clássico continua com a barra lateral de categorias
{
  const { page, ctx } = await open('classico');
  check('clássico: mantém a lista lateral "Todos os modelos"', await page.getByRole('button', { name: 'Todos os modelos' }).count() === 1);
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
