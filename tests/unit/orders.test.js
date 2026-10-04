import { describe, it, expect } from 'vitest';
import { filterOrders, summarize, topProducts, dailyTotals, periodRange, periodLabel, orderCode, ageInfo, ordersCsv, itemsCsv, dayKey } from '../../src/lib/orders';

const NOW = new Date(2026, 9, 4, 15, 0, 0); // 04/10/2026 15:00 (local)
const at = (day, h = 10) => new Date(2026, 9, day, h, 0, 0).toISOString();
const mk = (id, over = {}) => ({
  id: `${id}0000000-0000-0000-0000-000000000000`, client_name: 'Maria', client_phone: '(48) 99999-1111', created_at: at(3), status: 'novo',
  total: 100, delivery_method: 'retirada', items: [{ id: 'p1', title: 'Vaso', price: 50, quantity: 2 }], notes: '', ...over,
});
const orders = [
  mk('a1', { created_at: at(4, 9), total: 100 }),
  mk('b2', { client_name: 'João Álvares', client_phone: '(11) 98888-2222', created_at: at(3), status: 'concluido', total: 70, delivery_method: 'entrega', delivery_address: 'Rua das Flores 10', items: [{ id: 'p2', title: 'Suporte de Celular', price: 35, quantity: 2, options: { Cor: 'Preto' } }] }),
  mk('c3', { created_at: at(1), status: 'cancelado', total: 999 }),
  mk('d4', { created_at: new Date(2026, 8, 20).toISOString(), status: 'em_producao', total: 30, items: [{ id: 'p1', title: 'Vaso', price: 30, quantity: 1 }] }),
];

describe('períodos', () => {
  it('hoje, 7 dias, mês e datas livres', () => {
    expect(periodRange('today', NOW).start).toEqual(new Date(2026, 9, 4));
    expect(periodRange('7d', NOW).start).toEqual(new Date(2026, 8, 28)); // 28/09
    expect(periodRange('month', NOW).start).toEqual(new Date(2026, 9, 1));
    expect(periodRange('all', NOW)).toEqual({ start: null, end: null });
    const r = periodRange('custom', NOW, '2026-10-02', '2026-10-03');
    expect(r.start).toEqual(new Date(2026, 9, 2));
    expect(r.end.getDate()).toBe(3);
    expect(r.end.getHours()).toBe(23);
  });
  it('datas inválidas viram "sem limite"', () => {
    expect(periodRange('custom', NOW, 'abc', '')).toEqual({ start: null, end: null });
  });
  it('rótulos', () => {
    expect(periodLabel('7d')).toBe('Últimos 7 dias');
    expect(periodLabel('custom', '2026-10-02', '2026-10-03')).toBe('02/10/2026 a 03/10/2026');
    expect(periodLabel('custom', '', '')).toBe('Todo o período');
  });
});

describe('filterOrders', () => {
  const ids = (list) => list.map(o => o.id[0] + o.id[1]);
  it('sem filtros devolve todos, mais recentes primeiro', () => {
    expect(ids(filterOrders(orders, {}, NOW))).toEqual(['a1', 'b2', 'c3', 'd4']);
  });
  it('por status, entrega e período', () => {
    expect(ids(filterOrders(orders, { status: 'concluido' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { delivery: 'entrega' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { period: 'today' }, NOW))).toEqual(['a1']);
    expect(ids(filterOrders(orders, { period: '7d' }, NOW))).toEqual(['a1', 'b2', 'c3']);
  });
  it('busca ignora acento e maiúscula, e acha por produto, endereço, código e telefone', () => {
    expect(ids(filterOrders(orders, { query: 'joao alvares' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: 'SUPORTE' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: 'flores' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: 'preto' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: '#B20000' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: '98888' }, NOW))).toEqual(['b2']);
    expect(ids(filterOrders(orders, { query: 'não existe' }, NOW))).toEqual([]);
  });
  it('ordenação', () => {
    expect(ids(filterOrders(orders, { sort: 'oldest' }, NOW))[0]).toBe('d4');
    expect(ids(filterOrders(orders, { sort: 'total_desc' }, NOW))[0]).toBe('c3');
    expect(ids(filterOrders(orders, { sort: 'total_asc' }, NOW))[0]).toBe('d4');
    expect(ids(filterOrders(orders, { sort: 'name' }, NOW))[0]).toBe('b2');
  });
  it('status desconhecido conta como Novo (como o painel)', () => {
    expect(filterOrders([mk('e5', { status: 'pending' })], { status: 'novo' }, NOW)).toHaveLength(1);
  });
});

describe('summarize', () => {
  const s = summarize(orders);
  it('cancelado fica fora do faturamento, do ticket e das unidades', () => {
    expect(s.count).toBe(4);
    expect(s.validCount).toBe(3);
    expect(s.cancelled).toBe(1);
    expect(s.revenue).toBe(200);
    expect(s.ticket).toBeCloseTo(200 / 3);
    expect(s.units).toBe(2 + 2 + 1);
    expect(s.novos).toBe(1);
    expect(s.received).toBe(70);
  });
  it('por status, com o valor cancelado à parte', () => {
    const can = s.byStatus.find(x => x.id === 'cancelado');
    expect(can.count).toBe(1); expect(can.total).toBe(0); expect(can.lostTotal).toBe(999);
    expect(s.byStatus.find(x => x.id === 'concluido').total).toBe(70);
  });
  it('lista vazia não quebra', () => {
    const e = summarize([]);
    expect(e.revenue).toBe(0); expect(e.ticket).toBe(0);
  });
});

describe('topProducts e dailyTotals', () => {
  it('soma por produto, sem cancelados, mais vendido primeiro', () => {
    const t = topProducts(orders);
    expect(t[0]).toMatchObject({ title: 'Vaso', quantity: 3, revenue: 130, orders: 2 });
    expect(t[1]).toMatchObject({ title: 'Suporte de Celular', quantity: 2, revenue: 70 });
    expect(topProducts(orders, 1)).toHaveLength(1);
  });
  it('total por dia, em ordem', () => {
    const d = dailyTotals(orders);
    expect(d.map(x => x.day)).toEqual(['2026-09-20', '2026-10-03', '2026-10-04']);
    expect(d[2]).toEqual({ day: '2026-10-04', count: 1, total: 100 });
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('código e tempo', () => {
  it('código curto em maiúsculas', () => expect(orderCode({ id: 'a1b2c3d4-0000' })).toBe('#A1B2C3'));
  it('há quanto tempo e alerta de pedido novo parado', () => {
    expect(ageInfo({ created_at: new Date(2026, 9, 4, 14, 30).toISOString(), status: 'novo' }, NOW).label).toBe('agora há pouco');
    expect(ageInfo({ created_at: new Date(2026, 9, 4, 12).toISOString(), status: 'novo' }, NOW).label).toBe('há 3 h');
    const old = ageInfo({ created_at: new Date(2026, 9, 1, 15).toISOString(), status: 'novo' }, NOW);
    expect(old.label).toBe('há 3 dias'); expect(old.stale).toBe(true);
    expect(ageInfo({ created_at: new Date(2026, 9, 1, 15).toISOString(), status: 'concluido' }, NOW).stale).toBe(false);
    expect(ageInfo({ created_at: new Date(2026, 9, 3, 15).toISOString(), status: 'novo' }, NOW).label).toBe('há 1 dia');
  });
});

describe('CSV', () => {
  it('uma linha por pedido', () => {
    const { header, rows } = ordersCsv([orders[1]]);
    expect(rows[0]).toHaveLength(header.length);
    expect(rows[0][0]).toBe('#B20000');
    expect(rows[0][4]).toBe('2x Suporte de Celular (Cor: Preto)');
    expect(rows[0][5]).toBe(2);
    expect(rows[0][6]).toBe('70,00');
    expect(rows[0][7]).toBe('Entrega');
    expect(rows[0][10]).toBe('Concluído');
  });
  it('uma linha por item, com subtotal', () => {
    const { header, rows } = itemsCsv([orders[1], orders[0]]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(header.length);
    expect(rows[0].slice(3, 9)).toEqual(['Suporte de Celular', 'Cor: Preto', 2, '35,00', '70,00', 'Concluído']);
  });
  it('pedido sem itens não quebra', () => {
    expect(itemsCsv([mk('f6', { items: null })]).rows).toEqual([]);
    expect(ordersCsv([mk('f6', { items: null })]).rows[0][4]).toBe('');
  });
});

import { itemProductLink } from '../../src/lib/orders';
describe('link do produto no item do pedido', () => {
  const products = [{ id: 'a', active: true }, { id: 'b', active: false }];
  it('produto ativo vira link da página pública', () => expect(itemProductLink({ id: 'a' }, products)).toEqual({ href: '/produto/a', note: '' }));
  it('produto inativo não vira link e avisa', () => expect(itemProductLink({ id: 'b' }, products)).toEqual({ href: null, note: 'produto inativo' }));
  it('produto removido não vira link e avisa', () => expect(itemProductLink({ id: 'z' }, products)).toEqual({ href: null, note: 'produto removido' }));
  it('item sem id (pedido antigo) fica como texto', () => expect(itemProductLink({}, products)).toEqual({ href: null, note: '' }));
});
