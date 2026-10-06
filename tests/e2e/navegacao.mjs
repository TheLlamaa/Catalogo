// Painel: menu agrupado (computador e celular), ações rápidas na lista de produtos e atalhos entre áreas.
import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const P = (id, title, extra = {}) => ({ id, title, description: 'd', price: 20, stock: 5, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'inherit',
  created_at: '2026-09-01T10:00:00Z', options: [], lead_time: null, badge: null, section: null, sort_order: Number(id.slice(1)), ...extra });
const products = [P('p1', 'Vaso Cubo'), P('p2', 'Chaveiro Gato', { category_ids: ['c2'] }), P('p3', 'Luminária Lua', { section: 'destaque', category_ids: ['c2'] })];
const categories = [{ id: 'c1', name: 'Vasos', slug: 'vasos', description: '', aura_color: 'none', sort_order: 1 }, { id: 'c2', name: 'Chaveiros', slug: 'chaveiros', description: '', aura_color: 'none', sort_order: 2 }];

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await launch();

async function abrir({ mobile = false, rows = [] } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const writes = [];
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (req.method() !== 'GET') {
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      writes.push({ method: req.method(), path: url.pathname, body });
      if (url.pathname === '/rest/v1/products') return json({ id: body?.id || 'novo' }, 201);
      return route.fulfill({ status: 204, headers: cors, body: '' });
    }
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(categories);
    if (url.pathname === '/rest/v1/site_settings') return json(rows);
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
    return json([]);
  });
  await page.goto(BASE + '/admin');
  return { page, ctx, writes };
}
const nav = (page, name) => page.locator('nav[aria-label="Seções do painel"]').getByRole('button', { name, exact: true });

{ // computador: menu lateral agrupado
  const { page, ctx, writes } = await abrir();
  await page.getByRole('button', { name: /^Pedidos \(/ }).waitFor();
  const grupos = await page.locator('nav[aria-label="Seções do painel"] [data-nav-section]').evaluateAll(els => els.map(e => e.getAttribute('data-nav-section')));
  check('menu agrupado em Vendas, Catálogo, Site e Sistema', grupos.join('|') === 'Vendas|Catálogo|Site|Sistema', grupos.join('|'));
  check('item ativo marcado (aria-current)', await page.locator('nav[aria-label="Seções do painel"] [aria-current="page"]').getAttribute('aria-label') === 'Pedidos (0)');

  // produtos: busca, filtros e ações rápidas
  await page.getByRole('button', { name: /^Produtos \(3\)/ }).click();
  await page.getByLabel('Buscar produtos').fill('lua');
  check('busca filtra a lista de produtos', (await page.locator('tbody tr').count()) === 1 && await page.getByText('Luminária Lua').isVisible());
  check('com filtro, setas de ordem somem', await page.getByRole('button', { name: /^Subir / }).count() === 0);
  await page.getByLabel('Buscar produtos').fill('');
  await page.getByRole('button', { name: /^Destaques \(1\)/ }).click();
  check('filtro Destaques mostra só os destacados', (await page.locator('tbody tr').count()) === 1);
  await page.getByRole('button', { name: /^Todos/ }).click();

  await page.getByRole('button', { name: 'Destacar Vaso Cubo' }).click();
  await page.waitForTimeout(400);
  const up1 = writes.filter(w => w.path === '/rest/v1/products').at(-1);
  check('estrela coloca o produto nos Destaques', up1?.body?.section === 'destaque' && up1?.body?.id === 'p1', JSON.stringify(up1?.body));
  check('ação rápida confirma o que aconteceu', await page.getByText('“Vaso Cubo” agora está nos Destaques.').isVisible());

  await page.getByRole('switch', { name: 'Mostrar Chaveiro Gato na vitrine' }).click();
  await page.waitForTimeout(400);
  const up2 = writes.filter(w => w.path === '/rest/v1/products').at(-1);
  check('interruptor tira o produto da vitrine', up2?.body?.active === false && up2?.body?.id === 'p2', JSON.stringify(up2?.body));
  check('estado do interruptor escrito (Na vitrine)', (await page.getByRole('switch', { name: 'Mostrar Vaso Cubo na vitrine' }).innerText()).includes('Na vitrine'));

  // categorias: contagem e atalho para a lista filtrada
  await nav(page, 'Categorias (2)').click();
  await page.getByRole('button', { name: 'Ver os 2 produtos de Chaveiros' }).click();
  await page.getByRole('heading', { name: 'Produtos', exact: true }).waitFor();
  check('atalho da categoria abre Produtos já filtrado', (await page.getByLabel('Filtrar por categoria').inputValue()) === 'c2' && (await page.locator('tbody tr').count()) === 2);

  // Site: aviso antes de sair com alterações não publicadas
  await nav(page, 'Dados da loja').click();
  await page.getByLabel('Nome da loja').fill('Loja Nova');
  await nav(page, 'Aparência').click();
  check('trocar de área do Site mantém o que foi digitado', await page.getByText('Alterações não publicadas').isVisible());
  await nav(page, 'Produtos (3)').click();
  check('sair do Site sem publicar pede confirmação', await page.getByRole('dialog').getByText('Sair sem publicar?').isVisible());
  await page.getByRole('button', { name: 'Cancelar' }).click();
  check('cancelar mantém no Site', await page.getByRole('heading', { name: 'Aparência', exact: true }).isVisible());

  // Página inicial liga com Produtos
  await nav(page, 'Página inicial').click();
  await page.getByRole('button', { name: /^Publicar alterações/ }).click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Ver Destaques/ }).click();
  check('"Ver Destaques" leva aos produtos destacados', (await page.getByRole('button', { name: /^Destaques/ }).getAttribute('aria-pressed')) === 'true');
  await ctx.close();
}

{ // celular: o menu alcança todas as áreas (nada escondido em rolagem lateral)
  const { page, ctx } = await abrir({ mobile: true });
  const abrirMenu = page.getByRole('button', { name: /Abrir menu do painel/ });
  await abrirMenu.waitFor();
  check('celular: botão do menu mostra a área atual', (await abrirMenu.innerText()).includes('Pedidos'));
  await abrirMenu.click();
  const menu = page.getByRole('dialog', { name: 'Menu do painel' });
  const itens = await menu.getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(Boolean));
  check('celular: menu lista todas as áreas', ['Produtos (3)', 'Página inicial', 'Dados da loja', 'Recursos', 'Equipe'].every(n => itens.includes(n)), itens.join(' | '));
  await menu.getByRole('button', { name: 'Produtos (3)', exact: true }).click();
  check('celular: escolher no menu abre a área e fecha o menu', await page.getByRole('heading', { name: 'Produtos', exact: true }).isVisible() && await menu.count() === 0);
  check('celular: produtos em cards com ações visíveis', await page.getByRole('button', { name: 'Editar Vaso Cubo' }).isVisible() && await page.locator('table').count() === 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('celular: sem rolagem lateral na página', overflow <= 1, String(overflow));
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
process.exit(failed.length ? 1 : 0);
