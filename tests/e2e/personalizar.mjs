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
  if (url.pathname === '/rest/v1/products') return json([{ id: 'p1', title: 'Vaso Teste', description: 'd', price: 30, stock: 5, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-01T10:00:00Z', options: [], sort_order: 1 }]);
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

// ordem das seções e bloco extra (Página inicial > Seções e blocos)
writes.length = 0;
await page.getByRole('button', { name: 'Página inicial', exact: true }).first().click();
await page.getByRole('heading', { name: 'Página inicial', exact: true }).waitFor();
await page.getByRole('button', { name: 'Descer Categorias com foto' }).click();
await page.getByRole('button', { name: 'Texto', exact: true }).click();
await page.locator('#bloco-blockA-t').fill('Meu aviso');
await page.locator('#bloco-blockA-x').fill('Entregas até sexta.');
check('o bloco novo entra na lista de ordem', await page.getByRole('button', { name: 'Subir Meu aviso' }).count() === 1);
await page.getByRole('button', { name: 'Publicar alterações' }).click();
await page.waitForTimeout(600);
const grav = writes.find(w => w.method === 'POST')?.body ?? [];
check('publica a ordem trocada e o bloco', grav.some(r => r.key === 'homeSections' && r.value.startsWith('passos,categorias,')) && grav.some(r => r.key === 'blockA' && r.value.includes('Meu aviso')), JSON.stringify(grav).slice(0, 300));

// prévia acompanha o campo em edição
await page.getByRole('button', { name: 'Pedidos e carrinho', exact: true }).first().click();
await page.getByRole('button', { name: 'Prévia ao vivo' }).click();
const frame = page.frameLocator('iframe[title^="Prévia da vitrine"]');
await frame.locator('article').first().waitFor({ timeout: 10000 });
await page.locator('#s-cartTitle').focus();
await frame.getByRole('dialog', { name: /Seu Orçamento/ }).waitFor({ timeout: 8000 });
check('editar o carrinho abre o carrinho na prévia', true);
await page.getByRole('button', { name: 'Contato e redes', exact: true }).first().click();
await page.locator('#s-footerText').focus();
await page.waitForTimeout(800);
check('editar o rodapé fecha o carrinho na prévia', await frame.getByRole('dialog', { name: /Seu Orçamento/ }).count() === 0);

// backup das configurações: baixar e carregar
await page.getByRole('button', { name: 'Avançado', exact: true }).first().click();
const [baixado] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar backup' }).click()]);
check('backup baixa um arquivo .json', /^configuracoes-\d{4}-\d{2}-\d{2}\.json$/.test(baixado.suggestedFilename()), baixado.suggestedFilename());
await page.getByLabel('Arquivo de backup das configurações').setInputFiles({
  name: 'backup.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ app: 'catalogo-configuracoes', v: 1, t: 'x', rows: [{ key: 'storeName', value: 'Loja do Backup' }, { key: 'inventada', value: 'x' }] })),
});
await page.getByRole('dialog').getByRole('button', { name: 'Carregar no rascunho' }).click();
await page.getByRole('button', { name: 'Contato e redes', exact: true }).first().click();
check('backup carregado vira rascunho no formulário', (await page.locator('#s-storeName').inputValue()) === 'Loja do Backup');
check('e nada foi publicado sozinho', await page.getByText(/Alterações não publicadas/).count() >= 1);

// seções recolhíveis
await page.getByRole('button', { name: 'Página inicial', exact: true }).first().click();
await page.getByRole('heading', { name: 'Página inicial', exact: true }).waitFor();
const cab = (t) => page.getByRole('button', { name: new RegExp('^' + t) }).first();
check('seção do fim da lista começa recolhida', (await cab('Passo a passo do pedido').getAttribute('aria-expanded')) === 'false' && await page.locator('#s-howTitle').count() === 0);
await cab('Passo a passo do pedido').click();
check('clicar no título abre a seção', await page.locator('#s-howTitle').isVisible());
await page.getByRole('button', { name: 'Expandir todas' }).click();
check('"Expandir todas" abre todas', (await cab('Modelo da página inicial').getAttribute('aria-expanded')) === 'true' && (await cab('Faixa de aviso no topo').getAttribute('aria-expanded')) === 'true');
await page.getByRole('button', { name: 'Recolher todas' }).click();
check('"Recolher todas" fecha todas', await page.locator('#s-howTitle').count() === 0 && (await cab('Modelo da página inicial').getAttribute('aria-expanded')) === 'false');
await page.keyboard.press('Control+k');
await page.getByRole('textbox', { name: 'Buscar no painel' }).fill('passo 1');
await page.getByRole('button', { name: /Passo 1: título/ }).first().click();
await page.locator('#s-stepOneTitle').waitFor({ timeout: 4000 });
check('achar um campo pela busca abre a seção dele', await page.locator('#s-stepOneTitle').isVisible());
await page.reload();
await page.getByRole('button', { name: /Buscar no painel/ }).waitFor();
await page.getByRole('button', { name: 'Página inicial', exact: true }).first().click();
await page.getByRole('heading', { name: 'Página inicial', exact: true }).waitFor();
check('o que o dono abriu ou fechou é lembrado', (await cab('Passo a passo do pedido').getAttribute('aria-expanded')) === 'true' && (await cab('Modelo da página inicial').getAttribute('aria-expanded')) === 'false');

// celular: sem rolagem lateral nas áreas novas
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const mp = await mctx.newPage();
await mp.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/rpc/is_admin') return json(true);
  if (url.pathname === '/rest/v1/app_meta') return json([{ key: 'schema_version', value: '99' }]);
  return json([]);
});
await mp.goto(BASE + '/admin');
await mp.getByRole('button', { name: /Buscar no painel/ }).waitFor();
for (const area of ['Página inicial', 'Textos e mensagens', 'Menus e páginas', 'Avançado']) {
  await mp.getByRole('button', { name: /Seções do painel|Abrir menu do painel/ }).first().click();
  await mp.getByRole('dialog').getByRole('button', { name: new RegExp('^' + area) }).click();
  await mp.waitForTimeout(400);
  const largura = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check('celular: "' + area + '" sem rolagem lateral', largura.sw <= largura.cw + 1, JSON.stringify(largura));
}
await mctx.close();

await browser.close();
console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
process.exit(fails ? 1 : 0);
