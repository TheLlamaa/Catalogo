import { BASE, launch } from './env.mjs';

// Painel "Personalizar loja": busca global (Ctrl+K), erro no próprio campo, revisar alterações e restaurar a área.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));

const writes = [];
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/rpc/is_admin') return json(true);
  if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
  if (url.pathname === '/rest/v1/site_settings' && req.method() !== 'GET') {
    writes.push({ method: req.method(), body: req.postData() ? JSON.parse(req.postData()) : null });
    return route.fulfill({ status: 201, headers: cors, body: '' });
  }
  return json([]);
});

await page.goto(BASE + '/admin');
await page.getByRole('button', { name: /Buscar no painel/ }).waitFor();

// busca global
await page.keyboard.press('Control+k');
const paleta = page.getByRole('dialog', { name: 'Buscar no painel' });
await paleta.waitFor();
check('Ctrl+K abre a busca do painel', true);
await paleta.getByRole('textbox').fill('zap');
const opcao = paleta.getByRole('button', { name: /WhatsApp da loja/ });
check('"zap" acha o WhatsApp e mostra onde fica', await opcao.count() === 1 && (await opcao.innerText()).includes('Contato e redes'));
await paleta.getByRole('textbox').press('Enter');
await page.getByRole('heading', { name: 'Contato e redes', exact: true }).waitFor();
check('Enter abre o grupo certo', true);
check('o campo achado aparece na tela', await page.locator('#s-whatsapp').isVisible());

// erro no próprio campo
await page.locator('#s-whatsapp').fill('(48) 123');
await page.getByRole('button', { name: 'Publicar alterações' }).click();
const alerta = page.getByRole('alert').filter({ hasText: 'WhatsApp inválido' });
await alerta.first().waitFor();
check('WhatsApp inválido: erro aparece junto do campo', await page.locator('#campo-whatsapp').getByRole('alert').count() === 1);
check('nada foi gravado com erro', writes.length === 0);

// corrigir, mudar o nome e revisar
await page.locator('#s-whatsapp').fill('(48) 99999-1234');
await page.locator('#s-storeName').fill('Loja Nova');
check('o erro some ao corrigir', await page.locator('#campo-whatsapp').getByRole('alert').count() === 0);
check('campo mudado ganha o selo "Alterado"', await page.locator('#campo-storeName').getByText('Alterado').count() === 1);
check('mostra o padrão do campo mudado', await page.locator('#campo-storeName').getByText(/O padrão é/).count() === 1);
await page.getByRole('button', { name: /^Revisar/ }).click();
const rev = page.getByRole('dialog', { name: 'Revisar alterações' });
await rev.waitFor();
const texto = await rev.innerText();
check('revisão lista nome e WhatsApp com antes e depois', texto.includes('Nome da loja') && texto.includes('Loja Nova') && texto.includes('WhatsApp da loja'), texto.slice(0, 200));
await rev.getByRole('button', { name: 'Publicar agora' }).click();
await page.waitForTimeout(600);
const upsert = writes.find(w => w.method === 'POST')?.body ?? [];
check('publicar pela revisão grava as duas mudanças', upsert.some(r => r.key === 'storeName' && r.value === 'Loja Nova') && upsert.some(r => r.key === 'whatsapp' && r.value === '5548999991234'), JSON.stringify(upsert).slice(0, 200));

// restaurar a área ao padrão (só rascunho)
await page.locator('#s-storeName').fill('Outro nome');
await page.getByRole('button', { name: 'Voltar esta área ao padrão' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Voltar ao padrão' }).click();
await page.waitForTimeout(300);
check('restaurar a área devolve o padrão no formulário', (await page.locator('#s-storeName').inputValue()) !== 'Outro nome');

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
