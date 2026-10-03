import { BASE, launch } from './env.mjs';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };
const results = []; const check = (n, ok, e = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}${e ? ' — ' + e : ''}`); };
const browser = await launch();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const AURA = [{ id: 'abc123', name: 'Pôr do sol', colors: ['#f97316', '#ec4899', '#8b5cf6'], strong: true }];
const products = [
  { id: 'p1', title: 'Vaso', description: 'd', price: 10, stock: 3, active: true, category_ids: [], image_urls: [], aura_color: 'custom-abc123', created_at: '2026-09-30T10:00:00Z' },
  { id: 'p2', title: 'Suporte', description: 'd', price: 10, stock: 3, active: true, category_ids: ['c1'], image_urls: [], aura_color: 'inherit', created_at: '2026-09-29T10:00:00Z' },
  { id: 'p3', title: 'Aura Apagada', description: 'd', price: 10, stock: 3, active: true, category_ids: [], image_urls: [], aura_color: 'custom-zzz999', created_at: '2026-09-28T10:00:00Z' } ];
const cats = [{ id: 'c1', name: 'Casa', slug: 'casa', description: '', aura_color: 'custom-abc123' }];

async function open(admin, rows) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
  if (admin) await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)), session);
  const page = await ctx.newPage(); page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const st = { rows: [...rows], writes: [] };
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: cors, body: JSON.stringify(b) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/categories') return json(cats);
    if (url.pathname === '/rest/v1/site_settings') {
      if (req.method() === 'GET') return json(st.rows);
      const body = req.postData() ? JSON.parse(req.postData()) : null; st.writes.push({ method: req.method(), query: url.search, body });
      if (req.method() === 'POST') for (const r of body) { st.rows = st.rows.filter(x => x.key !== r.key); st.rows.push({ key: r.key, value: r.value }); }
      if (req.method() === 'DELETE') { const keys = decodeURIComponent(url.searchParams.get('key')).replace(/^in\.\(|\)$/g, '').split(','); st.rows = st.rows.filter(x => !keys.includes(x.key)); }
      return route.fulfill({ status: 204, headers: cors, body: '' });
    }
    return json([]);
  });
  return { page, ctx, st };
}
const row = [{ key: 'customAuras', value: JSON.stringify(AURA) }];

// 1) vitrine aplica a aura personalizada
{
  const { page, ctx } = await open(false, row);
  await page.goto(BASE + '/'); await page.getByText('Vaso').first().waitFor();
  const info = await page.evaluate(() => [...document.querySelectorAll('.aura')].map(e => ({ cls: e.className, stops: e.style.getPropertyValue('--aura-stops') })));
  const custom = info.filter(i => i.cls.includes('aura-custom'));
  check('produto e herança de categoria usam a aura personalizada', custom.length >= 2 && custom.every(i => i.stops === '#f97316, #ec4899, #8b5cf6, #f97316'), JSON.stringify(custom[0]));
  check('"brilho forte" aplica aura-glow', custom.every(i => i.cls.includes('aura-glow')));
  const apagada = await page.locator('article', { hasText: 'Aura Apagada' }).locator('xpath=ancestor::div[contains(@class,"aura")]').first().getAttribute('class');
  check('aura apagada: produto fica sem brilho (sem quebrar)', apagada.includes('aura-none') && !apagada.includes('aura-custom'), apagada);
  await ctx.close();
}
// 1b) JSON malformado no banco não quebra a vitrine
{
  const { page, ctx } = await open(false, [{ key: 'customAuras', value: '{lixo' }]);
  await page.goto(BASE + '/'); await page.getByText('Vaso').first().waitFor();
  check('JSON inválido no banco: site abre normalmente', true); await ctx.close();
}
// 1c) valores perigosos são ignorados (cor que não é #rrggbb)
{
  const bad = [{ id: 'abc123', name: 'X', colors: ['red; background:url(http://x)', '#fff000'], strong: false }];
  const { page, ctx } = await open(false, [{ key: 'customAuras', value: JSON.stringify(bad) }]);
  await page.goto(BASE + '/'); await page.getByText('Vaso').first().waitFor();
  check('cor fora do padrão #rrggbb é descartada', (await page.locator('.aura-custom').count()) === 0); await ctx.close();
}
// 2) painel admin
{
  const { page, ctx, st } = await open(true, row);
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: /^Auras/ }).click();
  check('lista mostra a aura existente e quantos usam', await page.getByText('Pôr do sol').first().isVisible() && await page.getByText('Em uso: 2').isVisible());
  await page.getByRole('button', { name: 'Nova aura' }).click();
  await page.getByLabel('Nome *').fill('Neon');
  await page.getByLabel('Cor 1', { exact: true }).fill('#00ff88'); await page.getByLabel('Cor 2', { exact: true }).fill('#0088ff');
  await page.getByRole('button', { name: 'Adicionar cor' }).click(); await page.getByLabel('Cor 3', { exact: true }).fill('#ff00aa');
  const prev = await page.locator('[aria-label="Prévia da aura"] .aura').first().evaluate(e => e.style.getPropertyValue('--aura-stops'));
  check('prévia muda ao vivo com as cores escolhidas', prev === '#00ff88, #0088ff, #ff00aa, #00ff88', prev);
  await page.getByRole('button', { name: 'Remover cor 3' }).click();
  check('remover cor funciona e mantém mínimo de 2', (await page.getByLabel(/^Cor \d$/).count()) === 2 && (await page.getByRole('button', { name: /Remover cor/ }).count()) === 0);
  await page.getByRole('button', { name: 'Adicionar cor' }).click(); await page.getByLabel('Cor 3', { exact: true }).fill('#ff00aa');
  await page.getByRole('button', { name: 'Salvar aura' }).click(); await page.waitForTimeout(500);
  const post = st.writes.find(w => w.method === 'POST');
  const saved = JSON.parse(post.body[0].value);
  check('salva as duas auras como JSON em customAuras', post.body[0].key === 'customAuras' && saved.length === 2 && saved[1].name === 'Neon' && saved[1].colors.join() === '#00ff88,#0088ff,#ff00aa' && /^[a-z0-9]{3,12}$/.test(saved[1].id), post.body[0].value.slice(0, 120));
  check('nova aura aparece na lista', await page.getByText('Neon').first().isVisible());
  // aparece no seletor de produtos e de categorias
  await page.getByRole('button', { name: /^Produtos/ }).click();
  check('aura nova aparece no seletor de aura do produto', (await page.locator('select[aria-label="Aura de Vaso"] option', { hasText: 'Neon (personalizada)' }).count()) === 1);
  await page.getByRole('button', { name: /^Categorias/ }).click();
  check('categoria exibe o nome da aura personalizada', await page.locator('span[role=img][title="Pôr do sol (personalizada)"]').isVisible());
  // excluir
  await page.getByRole('button', { name: /^Auras/ }).click();
  await page.getByRole('button', { name: 'Excluir Pôr do sol' }).click();
  check('excluir uma aura em uso avisa quantos itens são afetados', await page.getByText(/está em 2 produto/).isVisible());
  await page.getByRole('dialog').getByRole('button', { name: /Excluir/ }).click(); await page.waitForTimeout(500);
  const last = JSON.parse(st.writes.filter(w => w.method === 'POST').at(-1).body[0].value);
  check('depois de confirmar, só sobra a aura Neon', last.length === 1 && last[0].name === 'Neon');
  await page.getByRole('button', { name: 'Excluir Neon' }).click(); await page.getByRole('dialog').getByRole('button', { name: /Excluir/ }).click(); await page.waitForTimeout(500);
  check('apagar a última aura remove a chave do banco (DELETE)', st.writes.some(w => w.method === 'DELETE' && decodeURIComponent(w.query).includes('customAuras')));

  await ctx.close();
}
await browser.close();
const bad = results.filter(r => !r).length; console.log(`\n${results.length - bad}/${results.length} verificações passaram`); process.exit(bad ? 1 : 0);
