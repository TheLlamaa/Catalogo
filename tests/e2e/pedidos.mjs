import fs from 'node:fs';
import { BASE, launch } from './env.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'admin@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const orders = [
  { id: 'a1000000-0000-0000-0000-000000000000', client_name: 'Maria Silva', client_phone: '(48) 99999-7777', total: 138, created_at: hoursAgo(0.02), status: 'novo',
    delivery_method: 'entrega', delivery_address: 'Rua A, 10, Centro', notes: 'Prefiro azul',
    items: [{ id: 'p1', title: 'Vaso Ondulado', price: 69, quantity: 2, options: { Cor: 'Preto' }, imageUrls: [] }] },
  { id: 'b2000000-0000-0000-0000-000000000000', client_name: 'João Álvares', client_phone: '(11) 98888-1111', total: 60, created_at: hoursAgo(24 * 5), status: 'novo',
    delivery_method: 'retirada', items: [{ id: 'p2', title: 'Suporte de Celular', price: 30, quantity: 2, imageUrls: [] }] },
  { id: 'c3000000-0000-0000-0000-000000000000', client_name: '<b>Cliente Teste</b>', client_phone: '(21) 97777-2222', total: 29, created_at: hoursAgo(24 * 40), status: 'concluido',
    delivery_method: 'retirada', items: [{ id: 'p2', title: 'Suporte de Celular', price: 29, quantity: 1, imageUrls: [] }] },
  { id: 'd4000000-0000-0000-0000-000000000000', client_name: 'Pedro Cancelou', client_phone: '(47) 96666-3333', total: 500, created_at: hoursAgo(30), status: 'cancelado',
    delivery_method: 'retirada', items: [{ id: 'p3', title: 'Peça Cara', price: 500, quantity: 1, imageUrls: [] }] },
];

const customOrders = [
  { id: 'k1000000-0000-0000-0000-000000000000', client_name: 'Ana Custom', client_phone: '(48) 91111-2222', description: 'Chaveiro com meu nome', image_url: '', created_at: hoursAgo(5), status: 'novo' },
  { id: 'k2000000-0000-0000-0000-000000000000', client_name: 'Beto Custom', client_phone: '(48) 92222-3333', description: 'Suporte de controle', image_url: '', created_at: hoursAgo(80), status: 'concluido' },
];
let fails = 0;
const check = (n, c, e = '') => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (e ? ` — ${e}` : '')); };

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, acceptDownloads: true });
await ctx.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, session);
const page = await ctx.newPage();
page.on('pageerror', e => { fails++; console.log('PAGEERROR', e.message); });
await page.route('https://mock.supabase.co/**', async (route) => {
  const req = route.request(); const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/orders' && req.method() === 'GET') return json(orders);
  if (url.pathname === '/rest/v1/custom_orders' && req.method() === 'GET') return json(customOrders);
  return json([]);
});

await page.goto(BASE + '/admin');
await page.getByTestId('resumo-pedidos').waitFor();
const resumo = () => page.getByTestId('resumo-pedidos').innerText();
const cards = () => page.locator('div.cursor-pointer').count();

let r = await resumo();
check('mostra os 4 pedidos', await cards() === 4);
check('faturamento não conta cancelado (138+60+29 = 227)', /227,00/.test(r), r.replace(/\n/g, ' '));
check('aguardando resposta = 2 novos', /Aguardando resposta\s*2/.test(r));
check('ticket médio = 75,67', /75,67/.test(r));
check('pedido novo parado há 5 dias mostra alerta', await page.getByText('sem resposta').count() === 1);
check('card mostra código e itens', await page.getByText('#A10000').count() === 1 && await page.getByText('2x Vaso Ondulado').count() >= 1);
check('card mostra o endereço da entrega', await page.getByText('Rua A, 10, Centro').count() === 1);

// busca (ignora acento)
await page.getByLabel('Buscar pedidos').fill('joao alvares');
check('busca "joao alvares" acha João Álvares', await cards() === 1 && await page.getByText('João Álvares').count() >= 1);
await page.getByLabel('Buscar pedidos').fill('suporte');
check('busca por produto', await cards() === 2);
await page.getByLabel('Buscar pedidos').fill('99999');
check('busca por parte do telefone', await cards() === 1);
await page.getByRole('button', { name: /Limpar/ }).click();
check('"Limpar" volta aos 4 pedidos', await cards() === 4);

// período e recebimento
await page.getByLabel('Período').selectOption('7d');
check('últimos 7 dias: 3 pedidos (esconde o de 40 dias)', await cards() === 3);
await page.getByLabel('Período').selectOption('today');
check('hoje: só o pedido de agora', await cards() === 1);
await page.getByLabel('Período').selectOption('all');
await page.getByLabel('Recebimento').selectOption('entrega');
check('só entrega: 1 pedido', await cards() === 1);
await page.getByLabel('Recebimento').selectOption('all');

// chips de status
await page.getByRole('button', { name: /^Novo \(2\)/ }).click();
check('chip Novo: 2 pedidos', await cards() === 2);
await page.getByRole('button', { name: /^Todos/ }).click();

// ordenação
await page.getByLabel('Ordenar por').selectOption('total_desc');
check('maior valor primeiro (o cancelado de 500)', (await page.locator('div.cursor-pointer h3').first().innerText()) === 'Pedro Cancelou');
await page.getByLabel('Ordenar por').selectOption('recent');

// relatório (aba nova)
const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: 'Relatório' }).click()]);
await popup.waitForLoadState();
const rep = await popup.content();
check('relatório abre com título e período', rep.includes('Relatório de pedidos') && rep.includes('Todo o período'));
check('relatório traz produtos mais pedidos', rep.includes('Suporte de Celular') && rep.includes('Vaso Ondulado'));
check('relatório lista o cancelado mas não soma', rep.includes('Pedro Cancelou') && rep.includes('não contados'));
check('relatório escapa HTML do nome do cliente', !rep.includes('<b>Cliente Teste</b>') && rep.includes('&lt;b&gt;Cliente Teste&lt;/b&gt;'));
check('relatório tem botão de imprimir', await popup.getByRole('button', { name: /Imprimir/ }).isVisible());
await popup.close();

// relatório respeita filtros
await page.getByLabel('Período').selectOption('7d');
const [popup2] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: 'Relatório' }).click()]);
await popup2.waitForLoadState();
const rep2 = await popup2.content();
check('relatório do período não traz pedido de 40 dias', !rep2.includes('Cliente Teste') && rep2.includes('Últimos 7 dias'));
await popup2.close();
await page.getByLabel('Período').selectOption('all');

// planilhas
const [d1] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Planilha de itens' }).click()]);
const csv = fs.readFileSync(await d1.path(), 'utf8');
check('planilha de itens: uma linha por item, com produto e subtotal', csv.split('\r\n').length === 5 && csv.includes('"Vaso Ondulado";"Cor: Preto";"2";"69,00";"138,00"'), d1.suggestedFilename());
const [d2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Planilha de pedidos' }).click()]);
const csv2 = fs.readFileSync(await d2.path(), 'utf8');
check('planilha de pedidos: cabeçalho e 4 linhas', csv2.startsWith('﻿"Código";"Data"') && csv2.trim().split('\r\n').length === 5);

// pedidos personalizados também têm busca e filtros
await page.getByRole('button', { name: /Pedidos Custom/ }).click();
await page.getByLabel('Buscar pedidos').waitFor();
check('custom: lista os 2', await cards() === 2);
await page.getByLabel('Buscar pedidos').fill('controle');
check('custom: busca pela descrição', await cards() === 1 && await page.getByText('Beto Custom').count() >= 1);
await page.getByLabel('Buscar pedidos').fill('');
await page.getByLabel('Período').selectOption('custom');
await page.getByLabel('Data inicial').fill('2000-01-01');
await page.getByLabel('Data final').fill('2000-01-31');
check('custom: datas escolhidas sem pedidos no intervalo', await cards() === 0 && await page.getByText('Nenhuma solicitação com estes filtros.').count() === 1);

await browser.close();
process.exit(fails ? 1 : 0);
