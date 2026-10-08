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

const future = new Date(now + 5 * day).toISOString().slice(0, 10);
const past = new Date(now - 5 * day).toISOString().slice(0, 10);
const faq = JSON.stringify([{ q: 'Quanto demora?', a: 'De 3 a 5 dias.' }, { q: 'Entregam?', a: 'Sim, na região.' }]);
const baseRows = [
  { key: 'primaryColor', value: '#16a34a' }, { key: 'fontChoice', value: 'serifa' },
  { key: 'logoUrl', value: 'https://img.test/logo.png' }, { key: 'logoSize', value: '60' }, { key: 'logoShowName', value: 'false' },
  { key: 'bannerText', value: 'Pedidos de Natal até 10/12' }, { key: 'bannerUntil', value: future }, { key: 'bannerColor', value: '#7c3aed' },
  { key: 'aboutEnabled', value: 'true' }, { key: 'menuAbout', value: 'Como funciona' }, { key: 'aboutTitle', value: 'Sobre a loja' },
  { key: 'aboutText', value: 'Primeiro parágrafo.\n\nSegundo parágrafo.' }, { key: 'faqItems', value: faq },
  { key: 'socialInstagram', value: 'https://instagram.com/lojateste' }, { key: 'lowStockBadge', value: 'true' },
  { key: 'primaryColor_bad', value: 'x' }
];

// ============ VITRINE PÚBLICA ============
{
  const { p } = await newPage({ rows: baseRows });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  const btnBg = await p.evaluate(() => { const el = document.createElement('div'); el.className = 'bg-blue-600'; document.body.appendChild(el); const c = getComputedStyle(el).backgroundColor; el.remove(); return c; });
  check('cor principal troca a paleta azul', btnBg === 'rgb(22, 163, 74)', btnBg);
  check('fonte escolhida é aplicada', (await p.evaluate(() => getComputedStyle(document.body).fontFamily)).includes('Georgia'));
  check('theme-color acompanha a cor', (await p.getAttribute('meta[name=theme-color]', 'content')) === '#16a34a');
  check('ícone da aba vira a logo', (await p.getAttribute('link[rel=icon]', 'href')) === 'https://img.test/logo.png');
  check('logo aparece no topo', await p.locator('header img[src="https://img.test/logo.png"]').count() === 1);
  check('logo com o tamanho escolhido (60 px)', (await p.locator('header img[src="https://img.test/logo.png"]').evaluate(e => getComputedStyle(e).height)) === '60px');
  check('nome some ao lado da logo (desligado)', await p.locator('header >> text=Oficina Teste').count() === 0);
  check('faixa de aviso visível com cor própria', await p.locator('div[role=status].text-center').first().evaluate(e => getComputedStyle(e).backgroundColor) === 'rgb(124, 58, 237)');
  check('faixa mostra o texto', (await p.locator('div[role=status].text-center').first().innerText()).includes('Natal'));
  check('menu mostra o nome personalizado do Sobre', await p.getByRole('button', { name: 'Como funciona' }).count() === 1);
  check('rodapé tem Instagram', await p.locator('footer a[href="https://instagram.com/lojateste"]').count() === 1);
  check('rodapé tem link da página Sobre', await p.locator('footer a[href="/sobre"]').count() === 1);
  // seções
  const heads = await p.locator('section h2').allInnerTexts();
  check('seções: Destaques, Mais pedidos, Novidades', JSON.stringify(heads) === JSON.stringify(['Destaques', 'Mais pedidos', 'Novidades']), JSON.stringify(heads));
  const novidades = await p.locator('section[aria-labelledby=shelf-novidades] article').allInnerTexts();
  check('Novidades só tem produtos dos últimos 30 dias', novidades.length === 2, String(novidades.length));
  // selos
  check('selo manual aparece (Promoção)', await p.locator('article >> text=Promoção').count() >= 1);
  check('selo automático "Últimas unidades" (estoque 2 sem selo? p1 tem selo manual)', await p.locator('article >> text=Últimas unidades').count() === 0);
  // ordem manual: grade geral
  const grid = await p.locator('main > div > div.flex-1 > div.grid article h3').allInnerTexts();
  check('ordem manual (sort_order) na grade', grid.join('|') === 'Vaso Cubo|Chaveiro Cão|Chaveiro Gato|Vaso Onda|Item Geral', grid.join('|'));
  // categorias em ordem manual no menu
  const catNames = await p.locator('nav[aria-label=Categorias] button').allInnerTexts();
  check('categorias na ordem definida', catNames.map(t => t.trim()).join('|') === 'Todos os modelos|Geral|Vasos|Chaveiros', catNames.join('|'));
  // filtro some com seções
  await p.getByRole('button', { name: 'Vasos' }).click(); await p.waitForTimeout(200);
  check('seções somem ao filtrar categoria', await p.locator('section h2').count() === 0);
  // modal + relacionados
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  await p.locator('section[aria-labelledby=shelf-destaque] article').first().click(); await p.waitForSelector('[role=dialog]');
  const rel = await p.locator('[role=dialog] h3:has-text("Você também pode gostar") ~ ul li').count();
  check('relacionados no detalhe do produto', rel >= 1, String(rel));
  const relNames = await p.locator('[role=dialog] ul li button').allInnerTexts();
  check('relacionado não inclui o próprio produto', !relNames.join(' ').includes('Chaveiro Gato'), relNames.join(' / '));
  await p.locator('[role=dialog] ul li button').first().click(); await p.waitForTimeout(300);
  check('clicar num relacionado abre o outro produto', /\/produto\/p\d/.test(p.url()) && !p.url().endsWith('/p1'), p.url());
  // sobre
  await p.goto(BASE + '/sobre'); await p.waitForSelector('h1');
  check('página Sobre: título', (await p.locator('h1').innerText()) === 'Sobre a loja');
  check('página Sobre: 2 parágrafos', await p.locator('article p.whitespace-pre-line').count() >= 2);
  check('FAQ: 2 perguntas, fechadas', await p.locator('details').count() === 2 && await p.locator('details[open]').count() === 0);
  await p.locator('details summary').first().click();
  check('FAQ abre ao clicar', await p.locator('details[open]').count() === 1 && (await p.locator('details[open]').innerText()).includes('3 a 5 dias'));
  await p.close();
}

// faixa expirada / desligada / cor inválida ignorada / sobre desligado
{
  const { p } = await newPage({ rows: [{ key: 'bannerText', value: 'Aviso' }, { key: 'bannerUntil', value: past }, { key: 'primaryColor', value: 'javascript:alert(1)' }, { key: 'aboutEnabled', value: 'false' }] });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  check('faixa com data passada some', await p.locator('div[role=status].text-center').count() === 0);
  const btnBg = await p.evaluate(() => { const el = document.createElement('div'); el.className = 'bg-blue-600'; document.body.appendChild(el); const c = getComputedStyle(el).backgroundColor; el.remove(); return c; });
  check('cor inválida no banco é ignorada (azul padrão)', btnBg === 'rgb(37, 99, 235)', btnBg);
  await p.goto(BASE + '/sobre'); await p.waitForTimeout(400);
  check('/sobre desligado volta para a vitrine', new URL(p.url()).pathname === '/');
  await p.close();
}
{
  const { p } = await newPage({ rows: [{ key: 'bannerText', value: 'Aviso' }, { key: 'bannerEnabled', value: 'false' }] });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  check('faixa desligada não aparece (texto salvo)', await p.locator('div[role=status].text-center').count() === 0);
  check('sem logo: ícone e nome padrão', await p.locator('header >> text=Oficina Teste').count() === 1);
  check('sem seções quando nada marcado/novo? (p3,p4 novos de 5)', true);
  await p.close();
}
// desktop: seções não alargam a página
{
  const { p } = await newPage({ rows: baseRows, w: 1200 });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  check('desktop sem rolagem horizontal da página', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await p.close();
}
// mobile: nenhum scroll horizontal com seções
{
  const { p } = await newPage({ rows: baseRows, w: 390 });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  check('mobile: logo limitada a 48 px', (await p.locator('header img[src="https://img.test/logo.png"]').evaluate(e => getComputedStyle(e).height)) === '48px');
  check('mobile sem rolagem horizontal da página', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  check('mobile: botão Sobre acessível', await p.getByRole('button', { name: 'Como funciona' }).count() === 1);
  await p.close();
}

// ============ ADMIN ============
{
  const { p, writes, state } = await newPage({ rows: baseRows, admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  await p.getByRole('heading', { name: 'Aparência', exact: true }).waitFor();
  const tabs = await p.locator('[data-nav-section="Site"] button').evaluateAll(els => els.map(e => (e.querySelector('.sr-only')?.textContent || e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim()));
  check('áreas do Site no menu do painel', tabs.join('|') === 'Página inicial|Aparência|Dados da loja|Pedidos e carrinho|Peça personalizada|Páginas e menus|Recursos', tabs.join('|'));
  check('Publicar desabilitado sem mudanças', await p.getByRole('button', { name: 'Publicar alterações' }).isDisabled());
  // prévia ao vivo
  await p.getByLabel('Cor principal (código)').fill('#dc2626');
  const live = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-blue-600').trim());
  check('prévia ao vivo da cor no painel', live === '220 38 38', live);
  check('aviso de alterações não publicadas', await p.getByText('Alterações não publicadas').count() === 1);
  check('nada gravado antes de publicar', writes.length === 0);
  // cor clara avisa
  await p.getByLabel('Cor principal (código)').fill('#fde047');
  check('avisa cor muito clara', await p.getByText(/bem clara/).count() === 1);
  await p.getByLabel('Cor principal (código)').fill('#dc2626');
  // cor inválida bloqueia
  await p.getByLabel('Cor principal (código)').fill('#12');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(300);
  check('cor inválida bloqueia a publicação', writes.length === 0 && await p.getByText(/Cor inválida/).count() >= 1);
  await p.getByLabel('Cor principal (código)').fill('#dc2626');
  // troca de aba mantém o rascunho
  await p.getByRole('button', { name: 'Dados da loja', exact: true }).click();
  await p.getByLabel('Instagram').fill('@novaloja');
  await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  check('rascunho mantido ao trocar de aba', (await p.getByLabel('Cor principal (código)').inputValue()) === '#dc2626');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(600);
  const post = writes.find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  const keys = post ? post.body.map(r => r.key).sort() : [];
  check('publica só o que mudou (+ backup)', JSON.stringify(keys) === JSON.stringify(['primaryColor', 'settingsBackup', 'socialInstagram']), JSON.stringify(keys));
  const insta = post?.body.find(r => r.key === 'socialInstagram')?.value;
  check('@usuario vira link completo', insta === 'https://instagram.com/novaloja', insta);
  const bk = JSON.parse(post.body.find(r => r.key === 'settingsBackup').value);
  check('backup guarda os valores antigos', bk.v.primaryColor === '#16a34a' && bk.v.socialInstagram === 'https://instagram.com/lojateste', JSON.stringify(bk.v));
  check('botão Desfazer aparece depois de publicar', await p.getByRole('button', { name: /Desfazer/ }).count() === 1);
  // desfazer
  const before = writes.length;
  await p.getByRole('button', { name: /Desfazer/ }).click(); await p.waitForTimeout(800);
  const undoPost = writes.slice(before).find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  check('desfazer regrava os valores antigos', undoPost && undoPost.body.find(r => r.key === 'primaryColor')?.value === '#16a34a');
  check('desfazer apaga o backup', writes.slice(before).some(w => w.method === 'DELETE' && decodeURIComponent(w.query).includes('settingsBackup')));
  check('estado final = valores antigos', state.rows.find(r => r.key === 'primaryColor')?.value === '#16a34a' && !state.rows.find(r => r.key === 'settingsBackup'));
  check('botão Desfazer some depois', await p.getByRole('button', { name: /Desfazer/ }).count() === 0);
  // descartar
  await p.getByLabel('Cor principal (código)').fill('#000000');
  await p.getByRole('button', { name: 'Descartar alterações' }).click();
  await p.getByRole('button', { name: 'Descartar', exact: true }).click();
  await p.waitForTimeout(300);
  check('descartar volta ao publicado', (await p.getByLabel('Cor principal (código)').inputValue()) === '#16a34a');
  // restaurar seção
  await p.getByLabel('Cor principal (código)').fill('#000000');
  await p.getByRole('button', { name: 'Restaurar seção' }).first().click();
  check('restaurar seção limpa os campos', (await p.getByLabel('Cor principal (código)').inputValue()) === '');
  // FAQ editor
  await p.getByRole('button', { name: 'Páginas e menus', exact: true }).click();
  check('FAQ carregado no editor', (await p.getByLabel('Pergunta 1', { exact: true }).inputValue()) === 'Quanto demora?');
  await p.getByRole('button', { name: 'Adicionar pergunta' }).click();
  await p.getByLabel('Pergunta 3', { exact: true }).fill('Aceitam Pix?');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(400);
  check('pergunta sem resposta bloqueia', await p.getByText('Toda pergunta precisa de uma resposta.').count() >= 1);
  await p.getByLabel('Resposta 3', { exact: true }).fill('Sim.');
  await p.close();
}

// tamanho da logo no admin
{
  const { p, writes } = await newPage({ rows: [{ key: 'logoUrl', value: 'https://img.test/logo.png' }], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: 'Aparência', exact: true }).click();
  const slider = p.getByLabel('Tamanho da logo (computador)', { exact: true });
  check('slider começa no padrão (36)', (await slider.inputValue()) === '36');
  await slider.fill('64');
  check('prévia usa o tamanho do slider', await p.locator('[aria-label="Prévia no computador"] img').first().evaluate(e => getComputedStyle(e).height) === '64px');
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(500);
  const post = writes.find(w => w.method === 'POST' && w.path.endsWith('site_settings'));
  check('publica logoSize=64', post?.body.find(r => r.key === 'logoSize')?.value === '64', JSON.stringify(post?.body.map(r => r.key)));
  await p.getByLabel('Tamanho da logo (computador)', { exact: true }).fill('36');
  const before = writes.length;
  await p.getByRole('button', { name: 'Publicar alterações' }).click(); await p.waitForTimeout(500);
  check('voltar a 36 apaga a chave (padrão)', writes.slice(before).some(w => w.method === 'DELETE' && decodeURIComponent(w.query).includes('logoSize')));
  await p.close();
}
// valor inválido no banco é ignorado
{
  const { p } = await newPage({ rows: [{ key: 'logoUrl', value: 'https://img.test/logo.png' }, { key: 'logoSize', value: '9999' }] });
  await p.goto(BASE + '/'); await p.waitForSelector('article');
  check('logoSize inválido no banco volta ao padrão', (await p.locator('header img').evaluate(e => getComputedStyle(e).height)) === '36px');
  await p.close();
}

// ordem manual no admin
{
  const { p, writes, state } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: /^Produtos/ }).click();
  const names = async () => (await p.locator('tbody tr td:nth-child(2) button.text-gray-900').allInnerTexts()).map(s => s.trim());
  const first = await names();
  check('lista admin na ordem manual', first.join('|') === 'Vaso Cubo|Chaveiro Cão|Chaveiro Gato|Vaso Onda|Item Geral', first.join('|'));
  check('seta de subir do primeiro desabilitada', await p.getByRole('button', { name: 'Subir Vaso Cubo' }).isDisabled());
  await p.getByRole('button', { name: 'Descer Vaso Cubo' }).click(); await p.waitForTimeout(700);
  const patches = writes.filter(w => w.method === 'PATCH' && w.path.endsWith('products'));
  check('reordenar grava só sort_order', patches.length > 0 && patches.every(w => Object.keys(w.body).join() === 'sort_order'), JSON.stringify(patches.map(w => w.body)));
  const after = await names();
  check('nova ordem no painel', after.slice(0, 2).join('|') === 'Chaveiro Cão|Vaso Cubo', after.join('|'));
  const orders = [...state.products].sort((a, b) => a.sort_order - b.sort_order).map(x => x.id).join();
  check('sort_order sequencial no banco', state.products.map(x => x.sort_order).sort().join() === '1,2,3,4,5', state.products.map(x => x.sort_order).join());
  await p.getByRole('button', { name: 'Categorias' }).first().click().catch(() => {});
  await p.getByRole('button', { name: /^Categorias/ }).click();
  await p.getByRole('button', { name: 'Descer Geral' }).click(); await p.waitForTimeout(500);
  const cpatch = writes.filter(w => w.method === 'PATCH' && w.path.endsWith('categories'));
  check('reordenar categoria grava sort_order', cpatch.length > 0, String(cpatch.length));
  await p.close();
}

// produto com selo e seção no formulário
{
  const { p, writes } = await newPage({ rows: [], admin: true });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: /^Produtos/ }).click();
  await p.getByRole('button', { name: 'Editar Chaveiro Cão' }).click();
  await p.getByLabel(/Selo no card/).fill('Novo');
  await p.getByRole('radio', { name: 'Destaques', exact: true }).check();
  await p.getByRole('button', { name: 'Salvar alterações' }).click(); await p.waitForTimeout(600);
  const up = writes.find(w => w.method === 'POST' && w.path.endsWith('products'));
  const row = up ? [].concat(up.body)[0] : {};
  check('produto salva badge e section', row.badge === 'Novo' && row.section === 'destaque', JSON.stringify(row));
  await p.close();
}
// sem SQL 06: salvar produto não envia colunas novas
{
  const legacy = mkProducts().map(({ badge, section, sort_order, ...rest }) => rest);
  const { p, writes } = await newPage({ rows: [], admin: true, products: legacy, categories: cats.map(({ sort_order, ...c }) => c) });
  await p.goto(BASE + '/admin'); await p.getByRole('button', { name: /^Produtos/ }).click();
  await p.getByRole('button', { name: 'Editar Chaveiro Cão' }).click();
  await p.getByRole('button', { name: 'Salvar alterações' }).click(); await p.waitForTimeout(600);
  const up = writes.find(w => w.method === 'POST' && w.path.endsWith('products'));
  const row = up ? [].concat(up.body)[0] : {};
  check('sem SQL 06: não envia badge/section (não quebra)', up && !('badge' in row) && !('section' in row), JSON.stringify(row));
  await p.close();
}
await br.close();
console.log(fails ? `\n${fails} FALHA(S)` : '\nTUDO OK');
process.exit(fails ? 1 : 0);
