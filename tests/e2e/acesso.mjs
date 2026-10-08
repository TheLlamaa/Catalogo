import { BASE, launch } from './env.mjs';

// Conta logada que NÃO é administradora vê um aviso em vez do painel; admin e falha na consulta abrem o painel.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'alguem@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

async function abrir(browser, rpc) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
    if (url.pathname === '/rest/v1/rpc/is_admin') return rpc === 'erro' ? json({ message: 'boom' }, 500) : json(rpc);
    return json([]);
  });
  return { page, ctx };
}

const browser = await launch();
const AVISO = 'Esta conta não tem acesso ao painel';

for (const [rpc, esperaAviso, nome] of [[false, true, 'não admin'], [true, false, 'admin'], ['erro', false, 'consulta com falha']]) {
  const { page, ctx } = await abrir(browser, rpc);
  await page.goto(BASE + '/admin');
  await page.waitForTimeout(1500);
  const aviso = await page.getByRole('heading', { name: AVISO }).count();
  check(`${nome}: ${esperaAviso ? 'vê o aviso' : 'não vê o aviso'}`, (aviso === 1) === esperaAviso);
  if (esperaAviso) check('aviso tem o botão de sair', await page.getByRole('button', { name: /Sair e trocar de conta/ }).count() === 1);
  else check(`${nome}: painel carregou`, await page.getByText('Verificando o acesso').count() === 0 && page.url().endsWith('/admin'));
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
