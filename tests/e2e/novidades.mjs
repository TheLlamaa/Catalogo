// Estoque direto na lista, arrastar para ordenar, categoria oculta, prévia ao vivo do Site,
// aviso da faixa sem texto e o fluxo do pedido como um leitor de tela o percebe.
import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const P = (id, title, extra = {}) => ({ id, title, description: 'd', price: 20, stock: 5, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'inherit',
  created_at: '2026-09-01T10:00:00Z', options: [], lead_time: null, badge: null, section: null, sort_order: Number(id.slice(1)), ...extra });
const products = [P('p1', 'Vaso Cubo'), P('p2', 'Chaveiro Gato', { category_ids: ['c2'] }), P('p3', 'Luminária Lua', { category_ids: ['c3'] })];
const categories = [
  { id: 'c1', name: 'Vasos', slug: 'vasos', description: '', aura_color: 'none', sort_order: 1, visible: true },
  { id: 'c2', name: 'Chaveiros', slug: 'chaveiros', description: '', aura_color: 'none', sort_order: 2, visible: false },
  { id: 'c3', name: 'Luminárias', slug: 'luminarias', description: '', aura_color: 'none', sort_order: 3, visible: true },
];
const settingsRows = [{ key: 'stockControl', value: 'true' }];

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await launch();

async function abrir({ admin = true, path = '/admin', viewport = { width: 1300, height: 900 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  if (admin) await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const writes = [];
  await ctx.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (req.method() !== 'GET') {
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      writes.push({ method: req.method(), path: url.pathname, query: url.search, body });
      return route.fulfill({ status: 204, headers: cors, body: '' });
    }
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') return json(settingsRows);
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
    return json([]);
  });
  await page.goto(BASE + path);
  return { page, ctx, writes };
}
const nav = (page, name) => page.locator('nav[aria-label="Seções do painel"]').getByRole('button', { name, exact: true });

{ // Produtos: estoque editável e arrastar para ordenar
  const { page, ctx, writes } = await abrir();
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor();
  await nav(page, 'Produtos (3)').click();
  const estoque = page.getByLabel('Estoque de Vaso Cubo');
  check('estoque é um campo editável na lista', await estoque.inputValue() === '5');
  await estoque.fill('0');
  await estoque.press('Enter');
  await page.waitForTimeout(400);
  const w1 = writes.filter(w => w.path === '/rest/v1/products').at(-1);
  check('Enter salva o estoque novo', w1?.body?.stock === 0 && w1?.body?.id === 'p1', JSON.stringify(w1?.body));
  check('confirma que esgotou', await page.getByText('“Vaso Cubo” agora está esgotado.').isVisible());

  const antes = writes.length;
  const outro = page.getByLabel('Estoque de Chaveiro Gato');
  await outro.fill('9');
  await outro.press('Escape');
  await page.waitForTimeout(300);
  check('Esc desfaz sem salvar', writes.length === antes && await outro.inputValue() === '5');

  const linhas = page.locator('tbody tr');
  check('linhas podem ser arrastadas', await linhas.first().getAttribute('draggable') === 'true');
  await linhas.nth(2).getByTitle('Arraste para mudar a posição').dragTo(linhas.nth(0));
  await page.waitForTimeout(500);
  const ordem = writes.filter(w => w.method === 'PATCH' && w.path === '/rest/v1/products' && 'sort_order' in (w.body || {}))
    .map(w => ({ id: new URLSearchParams(w.query).get('id')?.replace('eq.', ''), o: w.body.sort_order }));
  const pos = Object.fromEntries(ordem.map(x => [x.id, x.o]));
  check('arrastar a última para o topo grava a nova ordem', ordem.length > 0 && pos.p3 < (pos.p1 ?? Infinity), JSON.stringify(ordem));

  await page.getByLabel('Buscar produtos').fill('vaso');
  check('com filtro, linhas não são arrastáveis', await linhas.first().getAttribute('draggable') === null);
  await ctx.close();
}

{ // Categorias: esconder do menu
  const { page, ctx, writes } = await abrir();
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor();
  await nav(page, 'Categorias (3)').click();
  const sw = page.getByRole('switch', { name: 'Mostrar Vasos no menu da vitrine' });
  check('interruptor do menu mostra o estado', (await sw.getAttribute('aria-checked')) === 'true' && (await page.getByRole('switch', { name: 'Mostrar Chaveiros no menu da vitrine' }).getAttribute('aria-checked')) === 'false');
  await sw.click();
  await page.waitForTimeout(400);
  const w = writes.filter(x => x.path === '/rest/v1/categories').at(-1);
  check('interruptor esconde a categoria (visible=false)', w?.body?.visible === false && w?.body?.name === 'Vasos', JSON.stringify(w?.body));
  check('linhas de categoria podem ser arrastadas', await page.locator('tbody tr').first().getAttribute('draggable') === 'true');
  await ctx.close();
}

{ // Vitrine: categoria oculta some do menu, os produtos dela continuam
  const { page, ctx } = await abrir({ admin: false, path: '/' });
  await page.getByText('Chaveiro Gato').first().waitFor();
  check('categoria oculta não aparece na vitrine', await page.getByText('Chaveiros', { exact: true }).count() === 0);
  check('categorias visíveis continuam no menu', await page.getByText('Luminárias', { exact: true }).first().isVisible());
  check('produto da categoria oculta continua em "Todos"', await page.getByText('Chaveiro Gato').first().isVisible());
  await ctx.close();
}

{ // Site: prévia ao vivo e aviso da faixa sem texto
  const { page, ctx, writes } = await abrir();
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor();
  await nav(page, 'Dados da loja').click();
  await page.getByRole('button', { name: 'Prévia ao vivo' }).click();
  const quadro = page.frameLocator('iframe[title^="Prévia da vitrine"]');
  await quadro.getByText('Vaso Cubo').first().waitFor();
  check('prévia abre ao lado do formulário no computador', await page.getByRole('complementary', { name: 'Prévia da vitrine' }).isVisible());
  await page.getByLabel('Nome da loja').fill('Ateliê Prévia');
  await quadro.getByText('Ateliê Prévia').first().waitFor({ timeout: 4000 }).catch(() => {});
  check('mudança aparece na prévia sem publicar', await quadro.getByText('Ateliê Prévia').first().isVisible());
  check('nada foi gravado no banco', writes.filter(w => w.path === '/rest/v1/site_settings').length === 0);
  check('prévia não mostra a faixa de ambiente nem o painel', await quadro.getByTestId('faixa-ambiente').count() === 0);

  await page.getByRole('button', { name: 'Celular' }).click();
  await page.getByRole('button', { name: 'Computador' }).click();
  check('alterna tamanho celular/computador', (await page.getByRole('button', { name: 'Computador' }).getAttribute('aria-pressed')) === 'true');

  const carrinhoAntes = await page.evaluate(() => localStorage.getItem('catalogo-cart-v1'));
  await quadro.getByRole('button', { name: /Adicionar/ }).first().click();
  await page.waitForTimeout(300);
  check('carrinho da prévia não toca no carrinho de verdade', await page.evaluate(() => localStorage.getItem('catalogo-cart-v1')) === carrinhoAntes, String(carrinhoAntes));

  await page.getByRole('button', { name: 'Fechar prévia' }).click();
  check('fechar tira a prévia', await page.locator('iframe').count() === 0);

  await nav(page, 'Página inicial').click();
  const faixa = page.getByRole('switch', { name: /faixa/i }).first();
  if (await faixa.count()) {
    if ((await faixa.getAttribute('aria-checked')) !== 'true') await faixa.click();
    check('faixa ligada sem texto avisa que não aparece', await page.getByText('A faixa está ligada, mas sem texto ela não aparece no site.').isVisible());
  } else {
    check('faixa ligada sem texto avisa que não aparece', false, 'interruptor da faixa não encontrado');
  }
  await ctx.close();
}

{ // Celular: a prévia abre numa janela
  const { page, ctx } = await abrir({ viewport: { width: 390, height: 844 } });
  await page.getByRole('button', { name: /Abrir menu do painel/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dados da loja', exact: true }).click();
  await page.getByRole('button', { name: 'Prévia ao vivo' }).click();
  const janela = page.getByRole('dialog', { name: 'Prévia da vitrine' });
  check('celular: prévia abre em janela', await janela.isVisible());
  await page.keyboard.press('Escape');
  check('celular: Esc fecha a prévia', await janela.count() === 0);
  await ctx.close();
}

{ // Fluxo do pedido para leitor de tela
  const { page, ctx } = await abrir({ admin: false, path: '/' });
  await page.getByText('Vaso Cubo').first().waitFor();
  await page.getByRole('button', { name: /Adicionar/ }).first().click();
  const carrinho = page.getByRole('dialog');
  await carrinho.waitFor();
  const arvore = await carrinho.ariaSnapshot();
  check('botões de quantidade dizem de qual produto', /button "Aumentar quantidade de [^"]+"/.test(arvore) && /button "Diminuir quantidade de [^"]+"/.test(arvore), arvore.split('\n').filter(l => /quantidade/i.test(l)).join(' | '));
  check('"Remover" diz o que remove', /button "Remover [^"]+ do orçamento"/.test(arvore));
  check('quantidade é anunciada', /Quantidade: 1/.test(arvore));
  await carrinho.getByRole('button', { name: 'Avançar para Identificação' }).click();
  const focado = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('ao avançar, o foco vai para o título da etapa', focado === 'Informações para contato', String(focado));
  check('campos obrigatórios sem "asterisco" no nome', await page.getByRole('textbox', { name: 'Seu nome', exact: true }).count() === 1);
  await ctx.close();
}

{ // Sistema → Calculadora de preço
  const { page, ctx, writes } = await abrir();
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor();
  await nav(page, 'Calculadora de preço').click();
  const precoBox = page.getByRole('complementary', { name: 'Resultado' });
  const preco = { innerText: async () => (await precoBox.innerText()).replace(/\s+/g, ' ') }; // moeda vem com espaço especial
  check('calculadora abre com o preço dos valores de exemplo', (await preco.innerText()).includes('R$ 47,67'));
  await page.getByLabel(/^Peças na mesa/).fill('4');
  check('várias peças: mostra preço por peça e da mesa', /preço sugerido por peça/i.test(await preco.innerText()) && (await preco.innerText()).includes('Mesa com 4 peças'));
  await page.reload();
  await nav(page, 'Calculadora de preço').click();
  check('valores ficam guardados no navegador', (await page.getByLabel(/^Peças na mesa/).inputValue()) === '4');
  await page.getByLabel(/^Peças na mesa/).fill('1');
  await page.getByLabel('Usar como preço de um produto').selectOption('p2');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar preço' }).click();
  await page.waitForTimeout(400);
  const w = writes.filter(x => x.path === '/rest/v1/products').at(-1);
  check('"Aplicar" grava o preço sugerido no produto', w?.body?.id === 'p2' && w?.body?.price === 47.67, JSON.stringify(w?.body));
  await ctx.close();
}

{ // Versão nova publicada com o painel aberto: o arquivo da tela sumiu → recarrega sozinho, sem registrar erro
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  const logs = [];
  await ctx.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/error_log' && req.method() === 'POST') logs.push(req.postData());
    const body = url.pathname === '/rest/v1/app_meta' ? [{ key: 'schema_version', value: '99' }] : url.pathname === '/rest/v1/products' ? products : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  });
  let falhou = 0;
  await page.route(/\/assets\/AdminView-[^/]+\.js$/, (route) => { if (falhou++ === 0) return route.fulfill({ status: 404, contentType: 'text/html', body: 'not found' }); return route.continue(); });
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor({ timeout: 10000 }).catch(() => {});
  check('arquivo antigo some: a página recarrega e o painel abre', falhou >= 2 && await page.getByRole('button', { name: /^Pedidos \(/ }).isVisible(), `tentativas=${falhou}`);
  check('isso não vira "erro do site"', logs.length === 0, logs.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
process.exit(failed.length ? 1 : 0);
