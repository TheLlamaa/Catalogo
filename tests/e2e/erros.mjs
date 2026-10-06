import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

async function abrir(browser, { logged = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  if (logged) await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  const state = { inserts: [], rows: [
    { id: '1', created_at: '2026-10-01T12:00:00Z', source: 'window', message: 'Cannot read properties of undefined', stack: 'TypeError: x\n at a.js:1', page: '/produto/1', user_agent: 'UA-Teste' },
  ], cleared: false };
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '13' }]);
    if (url.pathname === '/rest/v1/error_log') {
      if (req.method() === 'POST') { state.inserts.push(JSON.parse(req.postData())); return route.fulfill({ status: 201, headers: cors, body: '' }); }
      if (req.method() === 'GET') return json(state.rows);
      if (req.method() === 'DELETE') { state.cleared = true; state.rows = []; return route.fulfill({ status: 204, headers: cors, body: '' }); }
    }
    if (url.pathname === '/rest/v1/admins') return json([{ email: 'admin@teste.com', added_by: null, created_at: '2026-01-01T00:00:00Z' }]);
    return json([]);
  });
  return { page, ctx, state };
}

const browser = await launch();

{ // visitante: erro de JavaScript vira registro (uma vez só, mesmo se repetir)
  const { page, ctx, state } = await abrir(browser);
  await page.goto(BASE + '/');
  await page.waitForTimeout(500);
  await page.evaluate(() => { setTimeout(() => { throw new Error('Falha de teste e2e'); }, 0); });
  await page.evaluate(() => { setTimeout(() => { throw new Error('Falha de teste e2e'); }, 0); });
  await page.waitForTimeout(800);
  const mine = state.inserts.filter(i => i.message === 'Falha de teste e2e');
  check('erro do navegador é registrado', mine.length === 1, JSON.stringify(state.inserts));
  check('registro leva a página e o tipo', mine[0]?.page === '/' && mine[0]?.source === 'window');
  await ctx.close();
}

{ // admin: aba Erros lista, e limpa
  const { page, ctx, state } = await abrir(browser, { logged: true });
  await page.goto(BASE + '/admin');
  await page.getByRole('button', { name: /^Erros/ }).click();
  await page.getByText('Cannot read properties of undefined').waitFor();
  check('aba Erros mostra mensagem e página', await page.getByText(/\/produto\/1/).count() === 1);
  await page.getByRole('button', { name: 'Limpar lista' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Limpar lista' }).click();
  await page.getByText('Nenhum erro registrado.').waitFor();
  check('limpar apaga e mostra lista vazia', state.cleared);
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
