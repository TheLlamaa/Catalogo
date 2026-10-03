
import { BASE, launch } from './env.mjs';
const STORAGE = 'https://mock.supabase.co/storage/v1/object/public/fotos_produtos';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const products = [
  { id: 'p-opt', title: 'Vaso Ondulado', description: 'Vaso com opções', price: 69, stock: 5, active: true, category_ids: ['c1'],
    image_urls: [`${STORAGE}/aaa.jpg`], aura_color: 'inherit', created_at: '2026-09-30T10:00:00Z',
    options: [{ name: 'Cor', values: ['Branco', 'Preto'] }], lead_time: 'Sob encomenda: 3 a 5 dias' },
  { id: 'p-simple', title: 'Suporte de Celular', description: 'Suporte simples', price: 29, stock: 2, active: true, category_ids: ['c2'],
    image_urls: [], aura_color: 'inherit', created_at: '2026-09-29T10:00:00Z', options: [], lead_time: null },
];
const categories = [
  { id: 'c1', name: 'Casa', slug: 'casa', description: 'Itens para casa', aura_color: 'none' },
  { id: 'c2', name: 'Escritório', slug: 'escritorio', description: 'Itens de mesa', aura_color: 'none' },
];

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

async function newPage(browser, { failProducts = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const posts = [];
  const thumbRequests = [];
  const allReqs = [];
  page.on('request', r => allReqs.push(r.url()));
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.pathname.startsWith('/storage/')) {
      if (url.pathname.endsWith('_t.jpg')) { thumbRequests.push(url.pathname); return route.fulfill({ status: 404, body: 'nope' }); }
      return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG });
    }
    if (url.pathname === '/rest/v1/products') return failProducts ? route.abort() : json(products);
    if (url.pathname === '/rest/v1/categories') return failProducts ? route.abort() : json(categories);
    if (url.pathname === '/rest/v1/orders' && req.method() === 'POST') { posts.push(JSON.parse(req.postData())); return route.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
    return json([]);
  });
  return { page, ctx, posts, thumbRequests, allReqs };
}

const browser = await launch();

// 1) vitrine, filtros por URL, miniatura com fallback
{
  const { page, thumbRequests, allReqs } = await newPage(browser);
  await page.goto(BASE + '/');
  await page.getByText('Vaso Ondulado').first().waitFor();
  check('vitrine lista os 2 produtos', (await page.locator('article').count()) === 2);
  check('prazo de produção aparece no card', await page.getByText('Sob encomenda: 3 a 5 dias').first().isVisible());
  check('card com opções mostra "Escolher opções"', await page.getByRole('button', { name: /Escolher opções/ }).first().isVisible());
  const img = page.locator('article img').first();
  await page.waitForTimeout(400);
  check('miniatura pedida (_t.jpg)', thumbRequests.length > 0, thumbRequests[0] || '');
  check('cai para a foto grande se a miniatura não existe', (await img.getAttribute('src')).endsWith('/aaa.jpg'));
  await page.goto(BASE + '/?categoria=escritorio');
  await page.getByText('Suporte de Celular').first().waitFor();
  check('?categoria=escritorio filtra a lista', (await page.locator('article').count()) === 1 && await page.getByRole('heading', { name: 'Escritório' }).isVisible());
  await page.getByRole('button', { name: 'Todos os modelos' }).click();
  await page.waitForTimeout(150);
  check('"Todos os modelos" limpa o filtro da URL', !page.url().includes('categoria') && (await page.locator('article').count()) === 2);
  check('visitante nunca consulta product_private', !allReqs.some(u => u.includes('product_private')));
  await page.getByLabel('Buscar produtos').fill('suporte');
  await page.waitForTimeout(150);
  check('busca vai para ?q=', page.url().includes('q=suporte') && (await page.locator('article').count()) === 1);
  await page.close();
}

// 2) produto por link, Esc, opções obrigatórias, carrinho persistente
{
  const { page, ctx } = await newPage(browser);
  await page.goto(BASE + '/');
  await page.getByText('Vaso Ondulado').first().waitFor();
  await page.locator('article').first().click();
  await page.getByRole('dialog').waitFor();
  check('abrir produto muda o endereço para /produto/:id', page.url().endsWith('/produto/p-opt'));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  check('Esc fecha o produto e volta para /', new URL(page.url()).pathname === '/');

  await page.goto(BASE + '/produto/p-opt');
  await page.getByRole('dialog').waitFor();
  check('link direto abre o produto', await page.getByRole('dialog').getByRole('heading', { name: 'Vaso Ondulado' }).isVisible());
  check('título da aba usa o produto', (await page.title()).includes('Vaso Ondulado'));
  await page.getByRole('button', { name: /Adicionar ao Orçamento/ }).click();
  check('sem escolher a opção, avisa e não adiciona', await page.getByText('Escolha: Cor.').isVisible() && await page.getByRole('dialog', { name: 'Seu orçamento' }).count() === 0);
  await page.getByRole('button', { name: 'Preto' }).click();
  await page.getByRole('button', { name: /Adicionar ao Orçamento/ }).click();
  await page.getByRole('dialog', { name: 'Seu orçamento' }).waitFor();
  check('carrinho mostra a opção escolhida', await page.getByText('Cor: Preto').isVisible());
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.reload();
  await page.getByText('Vaso Ondulado').first().waitFor();
  check('carrinho sobrevive ao recarregar a página', await page.getByRole('button', { name: /Abrir orçamento \(1 item/ }).isVisible());
  await page.goto(BASE + '/produto/nao-existe');
  await page.getByText('Esse produto não está mais disponível.').waitFor();
  check('produto inexistente volta para a vitrine com aviso', new URL(page.url()).pathname === '/');
  await ctx.close();
}

// 3) checkout: validação, entrega, observação, WhatsApp
{
  const { page, posts, ctx } = await newPage(browser);
  await page.goto(BASE + '/');
  await page.getByText('Suporte de Celular').first().waitFor();
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Avançar para Identificação' }).click();
  await page.getByLabel('Seu Nome *').fill('Maria Silva');
  await page.getByLabel('Seu WhatsApp *').fill('4888887777');
  check('máscara do WhatsApp', (await page.getByLabel('Seu WhatsApp *').inputValue()) === '(48) 88887-777');
  await page.getByRole('button', { name: 'Finalizar Pedido' }).click();
  check('WhatsApp inválido é recusado', await page.getByText(/WhatsApp válido com DDD e 9 dígitos/).first().isVisible() && posts.length === 0);
  await page.getByLabel('Seu WhatsApp *').fill('48999997777');
  await page.getByText('Entrega', { exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar Pedido' }).click();
  check('entrega sem endereço é recusada', await page.getByText(/Informe o endereço/).first().isVisible() && posts.length === 0);
  await page.getByLabel(/Endereço/).fill('Rua das Flores 10, Centro, Florianópolis');
  await page.getByLabel(/Observações/).fill('Prefiro a cor azul');
  await page.getByRole('button', { name: 'Finalizar Pedido' }).click();
  await page.getByText('Pedido Registrado!').waitFor();
  const o = posts[0] || {};
  check('pedido enviado com entrega, endereço e observação', o.delivery_method === 'entrega' && o.delivery_address?.includes('Flores') && o.notes === 'Prefiro a cor azul' && o.client_phone === '(48) 99999-7777', JSON.stringify({ ...o, items: undefined }));
  check('itens do pedido são enxutos (sem produto inteiro)', Array.isArray(o.items) && o.items[0].title === 'Suporte de Celular' && !('description' in o.items[0]));
  const href = await page.getByRole('link', { name: /Continuar no WhatsApp/ }).getAttribute('href');
  check('botão "Continuar no WhatsApp" com resumo', href.startsWith('https://wa.me/5548999998888?text=') && decodeURIComponent(href).includes('1x Suporte de Celular') && decodeURIComponent(href).includes('Rua das Flores'));
  await page.getByRole('button', { name: 'Concluir' }).click();
  check('carrinho esvazia depois do pedido', await page.getByRole('button', { name: /Abrir orçamento \(0 item/ }).isVisible());
  await ctx.close();
}

// 4) privacidade e erro de carregamento
{
  const { page, ctx } = await newPage(browser);
  await page.goto(BASE + '/privacidade');
  await page.getByRole('heading', { name: 'Política de privacidade' }).waitFor({ timeout: 8000 }).catch(() => {});
  check('página de privacidade abre direto', await page.getByRole('heading', { name: 'Política de privacidade' }).isVisible());
  check('privacidade mostra o nome da loja', await page.getByText('Oficina Teste é uma loja').isVisible());
  await ctx.close();
  const f = await newPage(browser, { failProducts: true });
  await f.page.goto(BASE + '/');
  await f.page.getByText('Está demorando mais que o normal').waitFor({ timeout: 9000 }).catch(() => {});
  check('carregamento lento mostra aviso', await f.page.getByText('Está demorando mais que o normal').isVisible().catch(() => false) || await f.page.getByText('Não conseguimos carregar o catálogo').isVisible().catch(() => false));
  await f.page.getByText('Não conseguimos carregar o catálogo').waitFor({ timeout: 20000 }).catch(() => {});
  check('Supabase fora do ar mostra tela de erro (não branca)', await f.page.getByText('Não conseguimos carregar o catálogo').isVisible());
  await f.ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
process.exit(failed.length ? 1 : 0);
