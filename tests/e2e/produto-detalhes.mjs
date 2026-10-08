import { BASE, launch } from './env.mjs';

// Características e blocos de informação do produto: cadastro no painel e leitura na janela do produto.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const base = { description: 'A bandeja é imponente.', price: 90, stock: 5, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [], sort_order: 1, discount_percent: 0, specs: [], details: [] };
const products = [
  { ...base, id: 'p1', title: 'Bandeja Organ', specs: [{ n: 'Material', v: 'Cimento' }, { n: 'Altura', v: '20cm' }], details: [{ t: 'Cuidados com a peça', x: 'Acesse **esta aba** e veja [as dicas](https://loja.test/cuidados).' }] },
  { ...base, id: 'p2', title: 'Vaso Simples', sort_order: 2 },
];

const browser = await launch();
const writes = [];
async function abrir({ logged }) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 } });
  if (logged) await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/rpc/is_admin') return json(true);
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
    if (url.pathname === '/rest/v1/products') {
      if (req.method() === 'GET') return json(products);
      writes.push({ method: req.method(), body: JSON.parse(req.postData()) });
      return json({ id: 'p1' }, 201);
    }
    return json([]);
  });
  return { page, ctx };
}

{ // vitrine
  const { page, ctx } = await abrir({ logged: false });
  await page.goto(BASE + '/produto/p1');
  const dlg = page.getByRole('dialog', { name: 'Bandeja Organ' });
  await dlg.waitFor();
  const texto = await dlg.innerText();
  check('janela do produto mostra as características', texto.includes('CARACTERÍSTICAS') && texto.includes('Material:') && texto.includes('Cimento') && texto.includes('20cm'), texto.slice(0, 300));
  check('mostra o bloco com o título e a formatação', await dlg.getByRole('heading', { name: 'Cuidados com a peça' }).count() === 1 && await dlg.locator('strong', { hasText: 'esta aba' }).count() === 1);
  check('o link do bloco abre em outra aba com segurança', (await dlg.getByRole('link', { name: 'as dicas' }).getAttribute('href')) === 'https://loja.test/cuidados' && (await dlg.getByRole('link', { name: 'as dicas' }).getAttribute('rel')).includes('noopener'));
  await page.goto(BASE + '/produto/p2');
  const dlg2 = page.getByRole('dialog', { name: 'Vaso Simples' });
  await dlg2.waitFor();
  check('produto sem detalhes continua igual (sem seções extras)', !(await dlg2.innerText()).toUpperCase().includes('CARACTERÍSTICAS'));
  await ctx.close();
}

{ // painel
  const { page, ctx } = await abrir({ logged: true });
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: /^Produtos/ }).first().click();
  await page.getByRole('button', { name: 'Vaso Simples', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Detalhes do produto' }).waitFor();
  check('formulário mostra o grupo "Detalhes do produto"', true);
  await page.getByRole('button', { name: 'Material', exact: true }).click();
  await page.getByLabel('Valor da característica 1').fill('Cimento e acabamento premium');
  await page.getByRole('button', { name: 'Outra característica' }).click();
  await page.getByLabel('Nome da característica 2').fill('Peso');
  await page.getByLabel('Valor da característica 2').fill('860g');
  await page.getByRole('button', { name: 'Cuidados com a peça', exact: true }).click();
  await page.getByLabel('Texto do bloco 1').fill('Evite água parada.');
  await page.getByRole('button', { name: 'Outra característica' }).click();
  await page.getByLabel('Nome da característica 3').fill('Cor');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.waitForTimeout(400);
  check('característica com nome e sem valor bloqueia o salvamento', writes.length === 0 && await page.getByText(/precisa de um nome e de um valor/).count() >= 1);
  await page.getByRole('button', { name: 'Remover característica 3' }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.waitForTimeout(600);
  const corpo = writes[0]?.body ?? {};
  check('grava características no formato curto', JSON.stringify(corpo.specs) === JSON.stringify([{ n: 'Material', v: 'Cimento e acabamento premium' }, { n: 'Peso', v: '860g' }]), JSON.stringify(corpo.specs));
  check('grava o bloco de informação', JSON.stringify(corpo.details) === JSON.stringify([{ t: 'Cuidados com a peça', x: 'Evite água parada.' }]), JSON.stringify(corpo.details));
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
