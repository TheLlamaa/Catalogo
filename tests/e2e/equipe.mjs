import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'Admin@Teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

async function abrir(browser, { version = '9', metaError = false, adminsError = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
  const state = { admins: [{ email: 'admin@teste.com', added_by: null, created_at: '2026-01-01T00:00:00Z' }], inserts: [], deletes: [] };
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/app_meta') return metaError ? json({ message: 'relation "public.app_meta" does not exist' }, 404) : json([{ key: 'schema_version', value: version }]);
    if (url.pathname === '/rest/v1/admins') {
      if (adminsError) return json({ message: 'relation "public.admins" does not exist' }, 404);
      if (req.method() === 'GET') return json(state.admins);
      if (req.method() === 'POST') {
        const b = JSON.parse(req.postData());
        if (b.email === 'duplicado@teste.com') return json({ message: 'duplicate key value violates unique constraint' }, 409);
        state.inserts.push(b); state.admins.push({ ...b, created_at: new Date().toISOString() });
        return route.fulfill({ status: 201, headers: cors, body: '' });
      }
      if (req.method() === 'DELETE') { const e = decodeURIComponent(url.searchParams.get('email') || '').replace('eq.', ''); state.deletes.push(e); state.admins = state.admins.filter(a => a.email !== e); return route.fulfill({ status: 204, headers: cors, body: '' }); }
    }
    return json([]);
  });
  await page.goto(BASE + '/admin');
  return { page, ctx, state };
}

const browser = await launch();

{ // banco em dia: sem aviso; adicionar e remover
  const { page, ctx, state } = await abrir(browser);
  await page.getByRole('button', { name: /^Equipe/ }).click();
  await page.getByRole('list', { name: 'Administradores' }).waitFor();
  check('banco na versão esperada: sem aviso de atualização', await page.getByText(/versão \d+/).count() === 0);
  check('lista mostra o admin e marca "você" (mesmo com maiúsculas no login)', await page.getByText('admin@teste.com').count() === 1 && await page.getByText('você', { exact: true }).count() === 1);
  check('não dá para remover a si mesmo', await page.getByRole('button', { name: 'Remover acesso de admin@teste.com' }).isDisabled());

  await page.getByLabel('E-mail do novo administrador').fill('sem-arroba');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  check('e-mail inválido mostra erro e não envia', await page.getByRole('alert').filter({ hasText: 'e-mail válido' }).count() === 1 && state.inserts.length === 0);

  await page.getByLabel('E-mail do novo administrador').fill('admin@teste.com');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  check('e-mail repetido é barrado antes de enviar', await page.getByText('já é administrador').count() === 1 && state.inserts.length === 0);

  await page.getByLabel('E-mail do novo administrador').fill('  Novo@Teste.com ');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByText('novo@teste.com').first().waitFor();
  check('adiciona em minúsculas, sem espaços, registrando quem adicionou', state.inserts.length === 1 && state.inserts[0].email === 'novo@teste.com' && state.inserts[0].added_by === 'admin@teste.com', JSON.stringify(state.inserts));
  check('novo admin aparece na lista com "adicionado por"', await page.getByText('adicionado por admin@teste.com').count() === 1);

  await page.getByLabel('E-mail do novo administrador').fill('duplicado@teste.com');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByText(/Não foi possível adicionar/).waitFor();
  check('erro do banco aparece para quem usa', true);

  await page.getByRole('button', { name: 'Remover acesso de novo@teste.com' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
  await page.getByText('Acesso removido.').waitFor();
  await page.getByText('novo@teste.com').waitFor({ state: 'detached' });
  check('remove outro admin depois de confirmar', state.deletes.join() === 'novo@teste.com' && await page.getByText('novo@teste.com').count() === 0, state.deletes.join());
  await ctx.close();
}

{ // banco desatualizado
  const { page, ctx } = await abrir(browser, { version: '7' });
  await page.getByRole('alert').filter({ hasText: 'versão 7' }).waitFor();
  check('banco na versão 7: avisa qual versão e o que rodar', (await page.getByRole('alert').first().innerText()).includes('espera a 9'));
  await ctx.close();
}

{ // banco anterior ao SQL 08 (sem app_meta nem admins): avisa, não quebra
  const { page, ctx } = await abrir(browser, { metaError: true, adminsError: true });
  await page.getByRole('alert').filter({ hasText: '08-administradores.sql' }).first().waitFor();
  check('sem o SQL 08: aviso no topo do painel', true);
  check('o painel continua funcionando (aba Pedidos abre)', await page.getByRole('button', { name: /^Pedidos \(/ }).isVisible());
  await page.getByRole('button', { name: /^Equipe/ }).click();
  await page.getByText(/Não foi possível carregar a equipe/).waitFor();
  check('aba Equipe explica o que fazer e bloqueia o botão', await page.getByRole('button', { name: 'Adicionar' }).isDisabled());
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
