import { ORDER_STATUS, formatOptions, isHttpUrl, statusInfo } from './format';
import type { OrderLike } from '../types';

// ---------------------------------------------------------------------------
// Funções puras do painel de pedidos: filtros, resumo, ranking e linhas de CSV.
// Pedidos cancelados aparecem nas listas, mas ficam fora dos valores e do ranking.
// ---------------------------------------------------------------------------
export const PERIODS = [
  { id: 'all', label: 'Todo o período' },
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'custom', label: 'Escolher datas…' },
];

export const SORTS = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos' },
  { id: 'total_desc', label: 'Maior valor' },
  { id: 'total_asc', label: 'Menor valor' },
  { id: 'name', label: 'Nome do cliente (A-Z)' },
];

export const STALE_HOURS = 48; // pedido "Novo" sem resposta há mais que isso fica em alerta

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const parseDay = (s: unknown): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
export const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// { start, end } (Date ou null = sem limite)
export const periodRange = (period: string, now = new Date(), from = '', to = ''): { start: Date | null; end: Date | null } => {
  const daysAgo = (n: number) => startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  switch (period) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case '7d': return { start: daysAgo(6), end: endOfDay(now) };
    case '30d': return { start: daysAgo(29), end: endOfDay(now) };
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case 'custom': {
      const a = parseDay(from), b = parseDay(to);
      return { start: a, end: b ? endOfDay(b) : null };
    }
    default: return { start: null, end: null };
  }
};

export const periodLabel = (period: string, from = '', to = ''): string => {
  if (period !== 'custom') return PERIODS.find(p => p.id === period)?.label || 'Todo o período';
  const fmt = (s: string) => { const d = parseDay(s); return d ? d.toLocaleDateString('pt-BR') : ''; };
  if (fmt(from) && fmt(to)) return `${fmt(from)} a ${fmt(to)}`;
  if (fmt(from)) return `a partir de ${fmt(from)}`;
  if (fmt(to)) return `até ${fmt(to)}`;
  return 'Todo o período';
};

const norm = (s: unknown): string => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Código curto para achar/falar do pedido ("#A1B2C3")
export const orderCode = (order?: Pick<OrderLike, 'id'> | null): string => `#${String(order?.id ?? '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;

const searchText = (o: OrderLike) => norm([
  o.client_name, o.client_phone, orderCode(o), o.notes, o.delivery_address, o.description,
  ...(o.items || []).map(i => `${i.title} ${formatOptions(i.options)}`),
].join(' '));

export interface OrderFilters {
  status?: string;
  period?: string;
  from?: string;
  to?: string;
  delivery?: string;
  query?: string;
  sort?: string;
}

export const filterOrders = <T extends OrderLike>(orders: T[], opts: OrderFilters = {}, now = new Date()): T[] => {
  const { status = 'all', period = 'all', from = '', to = '', delivery = 'all', query = '', sort = 'recent' } = opts;
  const { start, end } = periodRange(period, now, from, to);
  const q = norm(query).trim();
  const qDigits = q.replace(/\D/g, '');
  const out = orders.filter(o => {
    if (status !== 'all' && statusInfo(o.status).id !== status) return false;
    const t = new Date(o.created_at as string);
    if (start && t < start) return false;
    if (end && t > end) return false;
    if (delivery !== 'all' && (o.delivery_method || '') !== delivery) return false;
    if (q) {
      const hay = searchText(o);
      const phoneHit = qDigits.length >= 3 && String(o.client_phone || '').replace(/\D/g, '').includes(qDigits);
      if (!hay.includes(q) && !phoneHit) return false;
    }
    return true;
  });
  const ts = (o: OrderLike) => new Date(o.created_at as string).getTime();
  const byDate = (a: T, b: T) => ts(b) - ts(a);
  const sorters: Record<string, (a: T, b: T) => number> = {
    recent: byDate,
    oldest: (a: T, b: T) => -byDate(a, b),
    total_desc: (a: T, b: T) => (Number(b.total) || 0) - (Number(a.total) || 0) || byDate(a, b),
    total_asc: (a: T, b: T) => (Number(a.total) || 0) - (Number(b.total) || 0) || byDate(a, b),
    name: (a: T, b: T) => String(a.client_name).localeCompare(String(b.client_name), 'pt-BR') || byDate(a, b),
  };
  return out.sort(sorters[sort] || byDate);
};

const isActive = (o: OrderLike) => statusInfo(o.status).id !== 'cancelado';
const unitsOf = (o: OrderLike) => (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

// Visão da caixa de entrada de pedidos: "scoped" ignora o status (para os números dos chips), "visible" é o que
// aparece na lista, "counts" são os pedidos de cada status dentro de "scoped" e "summary" resume o que está visível.
export const orderInbox = <T extends OrderLike>(orders: T[], filters: OrderFilters, status: string) => {
  const scoped = filterOrders(orders, { ...filters, status: 'all' });
  const visible = status === 'all' ? scoped : filterOrders(scoped, { status, sort: filters.sort });
  const counts: Record<string, number> = Object.fromEntries(summarize(scoped).byStatus.map(s => [s.id, s.count]));
  return { scoped, visible, counts, summary: summarize(visible) };
};

export const summarize = (orders: OrderLike[]) => {
  const valid = orders.filter(isActive);
  const revenue = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const byStatus = ORDER_STATUS.map(s => {
    const list = orders.filter(o => statusInfo(o.status).id === s.id);
    return { id: s.id, label: s.label, count: list.length, total: s.id === 'cancelado' ? 0 : list.reduce((a, o) => a + (Number(o.total) || 0), 0), lostTotal: s.id === 'cancelado' ? list.reduce((a, o) => a + (Number(o.total) || 0), 0) : 0 };
  });
  const done = orders.filter(o => statusInfo(o.status).id === 'concluido');
  return {
    count: orders.length,
    validCount: valid.length,
    cancelled: orders.length - valid.length,
    revenue,
    ticket: valid.length ? revenue / valid.length : 0,
    units: valid.reduce((s, o) => s + unitsOf(o), 0),
    novos: orders.filter(o => statusInfo(o.status).id === 'novo').length,
    received: done.reduce((s, o) => s + (Number(o.total) || 0), 0), // concluídos
    byStatus,
  };
};

export const topProducts = (orders: OrderLike[], limit = 10) => {
  const map = new Map<string, { title: string; quantity: number; revenue: number; orders: number }>();
  orders.filter(isActive).forEach(o => (o.items || []).forEach(i => {
    const key = (i.id || i.title) as string;
    const cur = map.get(key) || { title: i.title as string, quantity: 0, revenue: 0, orders: 0 };
    cur.quantity += Number(i.quantity) || 0;
    cur.revenue += (Number(i.price) || 0) * (Number(i.quantity) || 0);
    cur.orders += 1;
    map.set(key, cur);
  }));
  return [...map.values()].sort((a, b) => (b.quantity - a.quantity) || (b.revenue - a.revenue)).slice(0, limit);
};

// Valor por dia (mais antigo primeiro), só pedidos não cancelados
export const dailyTotals = (orders: OrderLike[]) => {
  const map = new Map<string, { day: string; count: number; total: number }>();
  orders.filter(isActive).forEach(o => {
    const k = dayKey(new Date(o.created_at as string));
    const cur = map.get(k) || { day: k, count: 0, total: 0 };
    cur.count += 1; cur.total += Number(o.total) || 0;
    map.set(k, cur);
  });
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
};

// "há 3 h", "há 2 dias"; stale = Novo sem resposta há muito tempo
export const ageInfo = (order: OrderLike, now = new Date()) => {
  const hours = Math.max(0, (now.getTime() - new Date(order.created_at as string).getTime()) / 3600000);
  let label: string;
  if (hours < 1) label = 'agora há pouco';
  else if (hours < 24) label = `há ${Math.floor(hours)} h`;
  else { const d = Math.floor(hours / 24); label = `há ${d} ${d === 1 ? 'dia' : 'dias'}`; }
  return { hours, label, stale: statusInfo(order.status).id === 'novo' && hours >= STALE_HOURS };
};

export const deliveryLabel = (o: OrderLike): string => (o.delivery_method === 'entrega' ? 'Entrega' : o.delivery_method ? 'Retirada' : '—');
const money = (v: unknown) => Number(v || 0).toFixed(2).replace('.', ',');
const dateTime = (iso: string | undefined) => new Date(iso as string).toLocaleString('pt-BR');
const itemsText = (o: OrderLike) => (o.items || []).map(i => { const opt = formatOptions(i.options); return `${i.quantity}x ${i.title}${opt ? ` (${opt})` : ''}`; }).join(' | ');

// Uma linha por pedido
export const ordersCsv = (orders: OrderLike[]) => ({
  header: ['Código', 'Data', 'Cliente', 'WhatsApp', 'Itens', 'Unidades', 'Total', 'Recebimento', 'Endereço', 'Observações', 'Status'],
  rows: orders.map(o => [
    orderCode(o), dateTime(o.created_at), o.client_name, o.client_phone, itemsText(o), unitsOf(o), money(o.total),
    deliveryLabel(o) === '—' ? '' : deliveryLabel(o), o.delivery_address || '', o.notes || '', statusInfo(o.status).label,
  ]),
});

// Uma linha por item (bom para somar por produto na planilha)
export const itemsCsv = (orders: OrderLike[]) => ({
  header: ['Código', 'Data', 'Cliente', 'Produto', 'Opções', 'Quantidade', 'Preço unitário', 'Subtotal', 'Status'],
  rows: orders.flatMap(o => (o.items || []).map(i => [
    orderCode(o), dateTime(o.created_at), o.client_name, i.title, formatOptions(i.options), Number(i.quantity) || 0,
    money(i.price), money((Number(i.price) || 0) * (Number(i.quantity) || 0)), statusInfo(o.status).label,
  ])),
});

// Link do modelo 3D do produto de um item de pedido (campo só do admin, vem em product.modelUrl).
// Devolve null quando o item não tem produto, o produto foi removido ou o link não é http(s) válido.
export const itemModelUrl = (
  item: { id?: string },
  products: { id: string; modelUrl?: string }[],
): string | null => {
  if (!item.id) return null;
  const url = products.find(p => p.id === item.id)?.modelUrl;
  return isHttpUrl(url) ? url : null;
};
