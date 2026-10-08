import { BASE, launch } from './env.mjs';

// Textos e regras da vitrine editáveis pelo painel (site_settings): o site mostra o que o dono escreveu
// e, sem nada gravado, continua igual ao padrão.
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const P = (id, title, extra = {}) => ({ id, title, description: `Descrição do ${title}`, price: 30, stock: 5, active: true, category_ids: ['c1'], image_urls: [],
  aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [], lead_time: 'Pronta entrega', badge: null, section: null, sort_order: Number(id.slice(1)), ...extra });
const products = Array.from({ length: 10 }, (_, i) => P(`p${i + 1}`, `Produto ${i + 1}`, i === 0 ? { stock: 0 } : {}));
const categories = [{ id: 'c1', name: 'Vasos', slug: 'vasos', description: '', aura_color: 'none', sort_order: 1 }];

const browser = await launch();

async function abrir(rows, path = '/') {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') return json(rows);
    return json([]);
  });
  await page.goto(BASE + path);
  await page.locator('article').first().waitFor();
  return { page, ctx };
}

{ // padrão: nada muda
  const { page, ctx } = await abrir([]);
  check('padrão: "Esgotado" no produto sem estoque', await page.getByText('Esgotado', { exact: true }).count() >= 1);
  check('padrão: busca com o texto de sempre', await page.getByPlaceholder('Buscar modelos...').count() === 1);
  check('padrão: escolha de ordem aparece', await page.getByLabel('Ordenar por').count() === 1);
  check('padrão: 10 produtos de uma vez (cabem nos 12)', await page.locator('article').count() === 10);
  check('padrão: sem endereço nem horário no rodapé', await page.getByText('Rua das Flores').count() === 0);
  check('padrão: link "Área do lojista" aparece', await page.getByRole('link', { name: 'Área do lojista' }).count() === 1);
  await ctx.close();
}

{ // textos e regras trocados
  const rows = [
    { key: 'tSoldOut', value: 'Acabou' }, { key: 'tSearchPlaceholder', value: 'Procure aqui' }, { key: 'tAllProducts', value: 'Tudo da loja' },
    { key: 'showSort', value: 'false' }, { key: 'pageSize', value: '8' }, { key: 'showCardDescription', value: 'false' },
    { key: 'address', value: 'Rua das Flores, 10' }, { key: 'openingHours', value: 'Seg a sex, 9h às 18h' }, { key: 'mapLink', value: 'https://maps.google.com/?q=loja' },
    { key: 'showAdminLink', value: 'false' }, { key: 'tFooterPrivacy', value: 'Privacidade' }, { key: 'socialPinterest', value: '@minhaloja' },
  ];
  const { page, ctx } = await abrir(rows);
  check('texto trocado: selo de esgotado', await page.getByText('Acabou', { exact: true }).count() >= 1 && await page.getByText('Esgotado', { exact: true }).count() === 0);
  check('texto trocado: busca', await page.getByPlaceholder('Procure aqui').count() === 1);
  check('texto trocado: "todos os produtos"', await page.getByRole('button', { name: 'Tudo da loja' }).count() === 1);
  check('ordem escondida', await page.getByLabel('Ordenar por').count() === 0);
  check('8 produtos por vez + botão "Ver mais"', await page.locator('article').count() === 8 && await page.getByRole('button', { name: /^Ver mais/ }).count() === 1);
  check('descrição do card escondida', await page.getByText('Descrição do Produto 2').count() === 0);
  const rodape = page.locator('footer');
  check('rodapé mostra endereço e horário', (await rodape.innerText()).includes('Rua das Flores, 10') && (await rodape.innerText()).includes('Seg a sex, 9h às 18h'));
  check('rodapé tem "Como chegar" e Pinterest', await rodape.getByRole('link', { name: 'Como chegar' }).getAttribute('href') === 'https://maps.google.com/?q=loja' && await rodape.getByRole('link', { name: 'Pinterest' }).getAttribute('href') === 'https://pinterest.com/minhaloja');
  check('link do lojista escondido; privacidade sempre visível com o texto novo', await rodape.getByRole('link', { name: 'Área do lojista' }).count() === 0 && await rodape.getByRole('link', { name: 'Privacidade' }).count() === 1);
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
