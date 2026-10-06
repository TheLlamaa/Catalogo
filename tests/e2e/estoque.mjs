import { BASE, launch } from './env.mjs';
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const products = [
  { id: 'p1', title: 'Suporte Simples', description: 'd', price: 20, stock: 2, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-30T10:00:00Z', options: [] },
  { id: 'p2', title: 'Peça Sem Estoque', description: 'd', price: 30, stock: 0, active: true, category_ids: [], image_urls: [], aura_color: 'inherit', created_at: '2026-09-29T10:00:00Z', options: [] },
];

async function abrir(browser, stockControlValue) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.pathname === '/rest/v1/products') return json(products);
    if (url.pathname === '/rest/v1/site_settings') return json(stockControlValue === null ? [] : [{ key: 'stockControl', value: stockControlValue }]);
    return json([]);
  });
  await page.goto(BASE + '/');
  await page.getByText('Suporte Simples').first().waitFor();
  return page;
}

const browser = await launch();

{ // padrão: controla estoque
  const page = await abrir(browser, null);
  check('padrão: avisa quando restam poucas unidades', await page.getByText('Restam 2 unidades').count() === 1);
  check('padrão: produto sem estoque mostra "Esgotado"', await page.getByText('Esgotado', { exact: true }).count() === 1);
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await page.getByRole('button', { name: /Abrir orçamento \(1 item/ }).waitFor();
  await page.close();
}

{ // desligado: tudo disponível, sem números
  const page = await abrir(browser, 'false');
  check('desligado: não mostra quantidade em estoque', await page.getByText(/Restam? \d+ unidade/).count() === 0);
  check('desligado: não mostra "Esgotado"', await page.getByText('Esgotado', { exact: true }).count() === 0);
  check('desligado: nenhum botão desabilitado', await page.getByRole('button', { name: 'Indisponível' }).count() === 0);
  const add = async (nth) => {
    await page.getByRole('button', { name: 'Adicionar' }).nth(nth).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  };
  for (let i = 0; i < 5; i++) await add(0);
  check('desligado: passa do número do cadastro (5 unidades de um produto com estoque 2)', await page.getByRole('button', { name: /Abrir orçamento \(5 item/ }).isVisible());
  await add(1);
  check('desligado: produto com estoque 0 também entra no carrinho', await page.getByRole('button', { name: /Abrir orçamento \(6 item/ }).isVisible());
  await page.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
