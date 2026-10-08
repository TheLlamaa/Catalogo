const abrirSecao = async (pg, titulo) => { const b = pg.getByRole('button', { name: new RegExp('^' + titulo) }).first(); if ((await b.getAttribute('aria-expanded')) === 'false') await b.click(); };
import { BASE, launch } from './env.mjs';
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:'u1',role:'authenticated',exp:4102444800})}.sig`;
const session = { access_token: jwt, token_type:'bearer', expires_in:3600, expires_at:4102444800, refresh_token:'r', user:{id:'u1',aud:'authenticated',role:'authenticated',email:'a@b.c',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'} };

const now = Date.now(), day = 86400000;
const iso = (d) => new Date(now - d * day).toISOString();
const cats = [['Chaveiros','c1',2],['Vasos','c2',1],['Geral','c3',0]].map(([name,id,so]) => ({ id, name, slug: id, description: 'desc', aura_color: 'none', sort_order: so }));
const mkProducts = () => [
  { id:'p1', title:'Chaveiro Gato', price:10, stock:2, section:'destaque', badge:'Promoção', sort_order:2, cat:['c1'], created:iso(100) },
  { id:'p2', title:'Chaveiro Cão', price:12, stock:5, section:'popular', badge:null, sort_order:1, cat:['c1'], created:iso(100) },
  { id:'p3', title:'Vaso Onda', price:30, stock:9, section:null, badge:null, sort_order:3, cat:['c2'], created:iso(2) },
  { id:'p4', title:'Vaso Cubo', price:35, stock:4, section:null, badge:null, sort_order:0, cat:['c2','c1'], created:iso(1) },
  { id:'p5', title:'Item Geral', price:5, stock:7, section:null, badge:null, sort_order:4, cat:['c3'], created:iso(100) },
].map(p => ({ id:p.id, title:p.title, description:'desc '+p.title, price:p.price, stock:p.stock, active:true, category_ids:p.cat, image_urls:['https://img.test/'+p.id+'.png'], aura_color:'none', options:[], lead_time:null, badge:p.badge, section:p.section, sort_order:p.sort_order, created_at:p.created }));

const br = await launch();

async function newPage({ rows, w: width, admin = false, products = mkProducts(), categories = cats }) {
  const w = width ?? (admin ? 1300 : 1100); // painel em largura de computador (menu lateral a partir de 1280 px)
  const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
  if (admin) await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)), session);
  const p = await ctx.newPage();
  const writes = [];
  const state = { rows: [...rows], products };
  await p.route('https://img.test/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await p.route('https://mock.supabase.co/**', async r => {
    const req = r.request(); const hd = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hd });
    const u = new URL(req.url()); const path = u.pathname;
    if (path === '/rest/v1/rpc/is_admin') return r.fulfill({ status: 200, contentType: 'application/json', headers: hd, body: 'true' });
    if (req.method() !== 'GET') {
      let body = null; try { body = req.postDataJSON(); } catch { body = req.postData(); }
      writes.push({ method: req.method(), path, query: u.search, body });
      if (path.endsWith('site_settings')) {
        if (req.method() === 'POST') for (const row of [].concat(body)) { state.rows = state.rows.filter(x => x.key !== row.key); state.rows.push({ key: row.key, value: row.value }); }
        if (req.method() === 'DELETE') { const m = decodeURIComponent(u.search).match(/key=in\.\((.*)\)/); const keys = m ? m[1].split(',').map(k => k.replace(/"/g, '')) : []; state.rows = state.rows.filter(x => !keys.includes(x.key)); }
      }
      if (path.endsWith('products') && req.method() === 'PATCH') { const id = new URL(req.url()).searchParams.get('id').replace('eq.', ''); const pr = state.products.find(x => x.id === id); if (pr && body) Object.assign(pr, body); }
      return r.fulfill({ status: 201, headers: { ...hd, 'content-type': 'application/json' }, body: '[]' });
    }
    let body = '[]';
    if (path.endsWith('/products')) body = JSON.stringify(state.products);
    if (path.endsWith('/categories')) body = JSON.stringify(categories);
    if (path.endsWith('/site_settings')) body = JSON.stringify(state.rows);
    return r.fulfill({ status: 200, contentType: 'application/json', headers: hd, body });
  });
  return { p, ctx, writes, state };
}


const pageA = JSON.stringify({ t: 'Trocas e devoluções', x: '# Prazo\n\nAceitamos **trocas** em até 7 dias.\n\n- Peça sem uso\n- Com a caixa', s: '', p: true });
const pageB = JSON.stringify({ t: 'Rascunho secreto', x: 'Ainda não.', s: '', p: false });
const rowsExtra = [
  { key: 'pageA', value: pageA }, { key: 'pageB', value: pageB },
  { key: 'menuTop', value: JSON.stringify([{ k: 'page', r: 'pageA', l: '' }, { k: 'home' }, { k: 'page', r: 'pageB', l: '' }, { k: 'about' }, { k: 'custom' }]) },
  { key: 'menuFoot', value: JSON.stringify([{ k: 'page', r: 'pageA', l: '' }, { k: 'link', r: 'https://ml.test/rodape', l: 'Loja ML' }]) },
  { key: 'cartTitle', value: 'Minha Sacola' }, { key: 'addToCartLabel', value: 'Quero este' },
  { key: 'whatsappButton', value: 'Falar no zap' },
  { key: 'orderMessageIntro', value: 'Oi! Sou {nome} e fiz um pedido.' },
  { key: 'bgTone', value: 'creme' }, { key: 'cardStyle', value: 'reto' }, { key: 'gridCols', value: '4' },
  { key: 'heroImage', value: 'https://img.test/capa.png' },
  { key: 'faviconUrl', value: 'https://img.test/icone.png' },
  { key: 'seoTitle', value: 'Minha Loja 3D — peças únicas' }, { key: 'seoDescription', value: 'Peças impressas sob medida.' },
  { key: 'seoImage', value: 'https://img.test/og.png' },
];

// ============ VITRINE ============
{
  const { p } = await newPage({ rows: rowsExtra });
  await p.goto(BASE + '/'); await p.waitForSelector('h2');
  const bg = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim());
  check('fundo creme aplicado', bg === '#fdf8ee', bg);
  const rad = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius-xl').trim());
  check('cantos retos aplicados', rad === '0.25rem', rad);
  check('título do site vem das configurações', (await p.title()) === 'Minha Loja 3D — peças únicas', await p.title());
  check('meta description editável', (await p.locator('meta[name=description]').getAttribute('content')) === 'Peças impressas sob medida.');
  check('imagem de compartilhamento criada', (await p.locator('meta[property="og:image"]').getAttribute('content')) === 'https://img.test/og.png');
  check('ícone da aba separado da logo', (await p.locator('link[rel=icon]').getAttribute('href')) === 'https://img.test/icone.png');
  check('capa da vitrine aparece', await p.locator('img[src="https://img.test/capa.png"]').count() === 1);
  check('4 colunas no computador', await p.locator('.lg\\:grid-cols-4').count() === 1);
  check('página no menu do topo, antes da Vitrine', await p.locator('header nav button').first().innerText() === 'Trocas e devoluções');
  check('rascunho não aparece no menu', await p.getByRole('button', { name: 'Rascunho secreto' }).count() === 0);
  check('link da página extra no rodapé', await p.locator('footer').getByRole('link', { name: 'Trocas e devoluções' }).count() === 1);
  await p.locator('footer').getByRole('link', { name: 'Trocas e devoluções' }).click();
  await p.waitForSelector('h1');
  check('página extra abre em /p/slug', new URL(p.url()).pathname === '/p/trocas-e-devolucoes', p.url());
  check('página mostra título, subtítulo, negrito e lista', await p.locator('article h1').innerText() === 'Trocas e devoluções' && await p.locator('article h2').innerText() === 'Prazo' && await p.locator('article strong').innerText() === 'trocas' && await p.locator('article li').count() === 2);
  check('título da aba da página extra', (await p.title()).startsWith('Trocas e devoluções'), await p.title());
  await p.goto(BASE + '/p/rascunho-secreto');
  await p.waitForURL(u => new URL(u).pathname === '/', { timeout: 5000 }).catch(() => {});
  check('página em rascunho volta para a vitrine', new URL(p.url()).pathname === '/', p.url());
  await p.goto(BASE + '/p/nao-existe');
  await p.waitForURL(u => new URL(u).pathname === '/', { timeout: 5000 }).catch(() => {});
  check('página inexistente volta para a vitrine', new URL(p.url()).pathname === '/', p.url());
  // carrinho
  await p.goto(BASE + '/'); await p.waitForSelector('h2');
  await p.getByRole('button', { name: /Abrir orçamento/ }).click();
  check('título do carrinho editável', await p.getByRole('heading', { name: 'Minha Sacola' }).count() === 1);
  check('rótulo do botão do produto está nas configurações', rowsExtra.some(r => r.key === 'addToCartLabel'));
  await p.close();
}

// ============ PRIVACIDADE PRÓPRIA ============
{
  const { p } = await newPage({ rows: [{ key: 'privacyText', value: 'Texto próprio da loja.\n\nSegundo bloco.' }] });
  await p.goto(BASE + '/privacidade'); await p.waitForSelector('h1');
  check('política própria substitui a padrão', await p.getByText('Texto próprio da loja.').count() === 1 && await p.getByText('Quais dados coletamos').count() === 0);
  await p.close();
}

// ============ SEM CONFIGURAÇÃO: tudo como antes ============
{
  const { p } = await newPage({ rows: [] });
  await p.goto(BASE + '/'); await p.waitForSelector('h1');
  check('padrão: título do index.html', (await p.title()).includes('Catálogo 3D'), await p.title());
  check('padrão: sem link de página extra', await p.getByRole('button', { name: 'Trocas e devoluções' }).count() === 0);
  check('padrão: sem capa', await p.locator('img[src="https://img.test/capa.png"]').count() === 0);
  await p.close();
}


// ============ VITRINE: exibição e pedidos ============
{
  const menuTop = JSON.stringify([{ k: 'home' }, { k: 'link', r: 'https://ml.test/loja', l: 'Mercado Livre' }, { k: 'about' }, { k: 'custom' }]);
  const menuFoot = JSON.stringify([{ k: 'link', r: 'https://ml.test/loja', l: 'Mercado Livre' }]);
  const { p } = await newPage({ rows: [
    { key: 'hidePrices', value: 'true' }, { key: 'showSearch', value: 'false' }, { key: 'defaultSort', value: 'price_desc' },
    { key: 'menuTop', value: menuTop }, { key: 'menuFoot', value: menuFoot }, { key: 'ordersPaused', value: 'true' }, { key: 'pausedMessage', value: 'Voltamos em março!' },
  ] });
  await p.goto(BASE + '/'); await p.waitForSelector('h1');
  check('preços escondidos na vitrine', !(await p.locator('body').innerText()).includes('R$'));
  check('busca escondida', await p.getByPlaceholder('Buscar modelos...').count() === 0);
  check('ordem padrão vem das configurações', (await p.locator('#ordem').inputValue()) === 'price_desc');
  check('link extra no menu', await p.locator('header').getByRole('link', { name: 'Mercado Livre' }).count() === 1);
  check('link extra no rodapé abre em nova aba', (await p.locator('footer').getByRole('link', { name: 'Mercado Livre' }).getAttribute('target')) === '_blank');
  await p.goto(BASE + '/custom'); await p.waitForSelector('form');
  check('pedidos pausados: aviso aparece', await p.getByText('Voltamos em março!').count() >= 1);
  check('pedidos pausados: botão de enviar desligado', await p.getByRole('button', { name: /Enviar solicitação/ }).isDisabled());
  await p.close();
}
{
  const { p } = await newPage({ rows: [] });
  await p.goto(BASE + '/'); await p.waitForSelector('h1');
  check('padrão: preços aparecem', (await p.locator('body').innerText()).includes('R$'));
  check('padrão: busca aparece', await p.getByPlaceholder('Buscar modelos...').count() === 1);
  check('padrão: ordem = mais recentes', (await p.locator('#ordem').inputValue()) === 'recent');
  await p.goto(BASE + '/custom'); await p.waitForSelector('form');
  check('padrão: pedidos abertos', await p.getByRole('button', { name: /Enviar solicitação/ }).isEnabled());
  await p.close();
}

// ============ ADMIN ============
{
  const { p, writes } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  await p.getByRole('heading', { name: 'Aparência', exact: true }).waitFor();
  // tema pronto preenche tudo
  await p.getByRole('button', { name: 'Floresta' }).click();
  check('tema pronto troca a cor principal', (await p.getByLabel('Cor principal (código)').inputValue()) === '#15803d');
  const bgNow = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim());
  check('tema pronto mostra o fundo na hora', bgNow === '#fdf8ee', bgNow);
  check('tema pronto não grava nada sozinho', writes.length === 0);
  // criar página pelo painel: incompleta bloqueia
  await p.getByRole('button', { name: 'Menus e páginas', exact: true }).click();
  check('nomes dos botões do menu aparecem na aba', await p.getByLabel('Nome do botão da vitrine').count() === 1 && await p.getByLabel('Nome do botão “Sobre”').count() === 1);
  await abrirSecao(p, 'Páginas');
  await p.getByRole('button', { name: 'Nova página' }).click();
  await p.getByLabel('Título da página').fill('Só título');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(300);
  check('página sem texto bloqueia', writes.length === 0 && await p.getByText(/preencha o título e o texto/).count() >= 1);
  await p.getByLabel('Texto da página').fill('Conteúdo da página');
  check('endereço sugerido a partir do título', (await p.getByLabel('Endereço da página').getAttribute('placeholder')) === 'so-titulo');
  await p.getByRole('button', { name: 'Negrito' }).click();
  check('botão de negrito insere marcação', (await p.getByLabel('Texto da página').inputValue()).includes('**negrito**'));
  await p.getByLabel('Texto da página').fill('Conteúdo da página');
  await p.getByRole('button', { name: 'Prévia', exact: true }).click();
  check('prévia mostra o texto', await p.getByText('Conteúdo da página').count() >= 1);
  // coloca a página no menu do topo e no rodapé
  await abrirSecao(p, 'Menu do topo');
  await abrirSecao(p, 'Links do rodapé');
  await p.getByRole('button', { name: 'Página', exact: true }).first().click();
  check('item de página no menu do topo', await p.getByLabel('Página do item').count() === 1);
  await p.getByRole('button', { name: 'Página', exact: true }).nth(1).click();
  await p.getByRole('button', { name: 'Link externo' }).nth(1).click();
  await p.getByLabel('Nome do link').fill('Loja');
  await p.getByLabel('Endereço do link').fill('javascript:alert(1)');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(300);
  check('link com endereço inválido bloqueia', writes.length === 0 && await p.getByText(/começar com https/).count() >= 1);
  await p.getByLabel('Endereço do link').fill('https://ml.test/loja');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(600);
  const post = writes.find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  const keys = post ? post.body.map(r => r.key).sort() : [];
  check('publica página, menus e tema', ['bgTone', 'cardStyle', 'fontChoice', 'pageA', 'menuTop', 'menuFoot', 'primaryColor'].every(k => keys.includes(k)), JSON.stringify(keys));
  const pg = post?.body.find(r => r.key === 'pageA')?.value;
  check('página guardada como JSON enxuto', pg && JSON.parse(pg).t === 'Só título' && JSON.parse(pg).s === 'so-titulo', pg);
  const mt = post?.body.find(r => r.key === 'menuTop')?.value;
  check('menu do topo guarda a página e mantém os botões da loja', mt && JSON.parse(mt).some(i => i.k === 'page' && i.r === 'pageA') && ['home', 'about', 'custom'].every(k => JSON.parse(mt).some(i => i.k === k)), mt);
  check('rodapé não guarda botões da loja', !JSON.parse(post?.body.find(r => r.key === 'menuFoot')?.value || '[]').some(i => ['home', 'about', 'custom'].includes(i.k)));
  // pedido mínimo inválido bloqueia
  await p.getByRole('button', { name: 'Pedidos e carrinho', exact: true }).click();
  await p.getByLabel('Pedido mínimo (R$)').fill('abc');
  const n0 = writes.length;
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(300);
  check('pedido mínimo inválido bloqueia', writes.length === n0 && await p.getByText(/Pedido mínimo: use um número/).count() >= 1);
  await p.getByLabel('Pedido mínimo (R$)').fill('30,50');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(600);
  const post2 = writes.slice(n0).find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  const keys2 = post2 ? post2.body.map(r => r.key) : [];
  check('publica pedido mínimo', keys2.includes('minOrder'), JSON.stringify(keys2));
  check('mínimo guardado como digitado', post2?.body.find(r => r.key === 'minOrder')?.value === '30,50');
  await p.close();
}

// ============ ADMIN: ligar o botão Sobre direto no menu ============
{
  const { p, writes } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Menus e páginas', exact: true }).click();
  await p.getByRole('listitem').filter({ hasText: 'Sobre' }).getByLabel('Mostrar na loja').check();
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(600);
  const post = writes.find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  check('ligar Sobre no menu grava aboutEnabled', post?.body.some(r => r.key === 'aboutEnabled' && r.value === 'true'));
  await p.goto(BASE + '/'); await p.waitForSelector('h1');
  check('botão Sobre aparece no menu da loja', await p.locator('header nav').getByRole('button', { name: 'Sobre' }).count() === 1);
  await p.close();
}

// ============ ADMIN: paginação dos produtos cadastrados ============
{
  const many = Array.from({ length: 25 }, (_, i) => ({ id: `q${i}`, title: `Peça ${String(i + 1).padStart(2, '0')}`, description: 'd', price: 10, stock: 3, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'none', options: [], lead_time: null, badge: null, section: null, sort_order: i, created_at: iso(i + 1) }));
  const { p } = await newPage({ rows: [], admin: true, products: many });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: /^Produtos/ }).click();
  await p.waitForSelector('tbody tr');
  check('produtos: 10 por página', await p.locator('tbody tr').count() === 10);
  check('produtos: mostra o intervalo', await p.getByText('Mostrando 1–10 de 25 produtos').count() >= 1);
  check('produtos: primeira página começa na peça 01', (await p.locator('tbody tr').first().innerText()).includes('Peça 01'));
  await p.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: 'Próxima página' }).click();
  check('produtos: segunda página começa na peça 11', (await p.locator('tbody tr').first().innerText()).includes('Peça 11'));
  check('produtos: primeiro da 2ª página pode subir', await p.getByRole('button', { name: 'Subir Peça 11' }).isEnabled());
  check('produtos: página muda o intervalo', await p.getByText('Mostrando 11–20 de 25 produtos').count() >= 1);
  await p.close();
}

// ============ ADMIN: orientação de tamanho junto dos campos de imagem ============
{
  const { p } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  await p.getByRole('heading', { name: 'Aparência', exact: true }).waitFor();
  await p.getByLabel('Buscar configurações').fill('imagem');
  await p.getByText('Tamanho ideal: 1600 × 500 px (proporção 16:5)').waitFor();
  check('capa: orientação de tamanho', await p.getByText('Tamanho ideal: 1600 × 500 px (proporção 16:5)').count() === 1);
  await p.getByLabel('Buscar configurações').fill('logo');
  check('logo: PNG transparente ou SVG', await p.getByText(/Tamanho ideal: 768 × 192 px.*transparente ou SVG/).count() === 1);
  await p.getByLabel('Buscar configurações').fill('ícone');
  check('ícone da aba: orientação', await p.getByText('Tamanho ideal: 256 × 256 px').count() === 1);
  await p.getByLabel('Buscar configurações').fill('compartilhamento');
  check('compartilhamento: 1200 × 630', await p.getByText('Tamanho ideal: 1200 × 630 px').count() >= 1);
  await p.getByRole('button', { name: /^Produtos/ }).click();
  await p.getByRole('button', { name: 'Novo produto' }).click();
  check('produto: orientação de tamanho das fotos', await p.getByText('Tamanho ideal: 800 × 800 px (proporção 1:1)').count() === 1);
  await p.close();
}

// ============ ADMIN: busca de configurações e ícones de colunas ============
{
  const { p, writes } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  await p.getByRole('heading', { name: 'Aparência', exact: true }).waitFor();
  const search = p.getByLabel('Buscar configurações');
  await search.fill('frete');
  check('busca troca a tela pelos resultados', await p.getByRole('heading', { name: 'Buscar configuração' }).isVisible());
  check('busca acha campo em outra aba (frete)', await p.getByText('Aviso sobre frete e prazo').count() >= 1);
  check('busca mostra a contagem', await p.getByRole('status').filter({ hasText: /configura/ }).count() >= 1);
  await search.fill('voce tambem');
  check('busca ignora acentos', await p.getByText(/Você também pode gostar/).count() >= 1);
  await search.fill('zzzxxx');
  check('busca sem resultado avisa', await p.getByText(/Nenhuma configuração encontrada/).count() === 1);
  await search.press('Escape');
  check('Esc limpa a busca e volta à área', (await search.inputValue()) === '' && await p.getByRole('heading', { name: 'Aparência', exact: true }).isVisible());
  // edita pela busca e a edição vale
  await search.fill('cor principal');
  await p.getByLabel('Cor principal (código)').fill('#7c3aed');
  await search.fill('');
  await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  check('edição feita pela busca é mantida', (await p.getByLabel('Cor principal (código)').inputValue()) === '#7c3aed');
  // ícones de colunas
  const radios = p.getByRole('radiogroup', { name: /Produtos por linha/ }).getByRole('radio');
  check('3 ícones de colunas (2, 3, 4)', await radios.count() === 3);
  check('3 colunas é o padrão marcado', (await p.getByRole('radio', { name: '3 colunas' }).getAttribute('aria-checked')) === 'true');
  await p.getByRole('radio', { name: '4 colunas' }).click();
  check('clicar no ícone troca a seleção', (await p.getByRole('radio', { name: '4 colunas' }).getAttribute('aria-checked')) === 'true');
  const n1 = writes.length;
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(600);
  const pst = writes.slice(n1).find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  check('publica colunas escolhidas', pst?.body.find(r => r.key === 'gridCols')?.value === '4', JSON.stringify(pst?.body.map(r => r.key)));
  await p.close();
}
await br.close();
console.log(fails ? `\n${fails} FALHA(S)` : '\nTUDO OK');
process.exit(fails ? 1 : 0);
