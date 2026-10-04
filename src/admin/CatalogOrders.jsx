import { useMemo, useState } from 'react';
import { Trash2, ExternalLink, ShoppingBag, Download, FileBarChart, MessageSquare, Truck, Store, AlertTriangle } from 'lucide-react';
import { useUI } from '../components/UIContext';
import { useSettings } from '../components/SettingsContext';
import { StatusSelect } from './StatusSelect';
import { OrderFilters, StatusChips, DEFAULT_FILTERS } from './OrderFilters';
import { brl, downloadCsv, formatOptions, toWhatsappDigits, whatsappLink } from '../lib/format';
import { ageInfo, filterOrders, itemsCsv, orderCode, ordersCsv, periodLabel, summarize } from '../lib/orders';
import { buildReportHtml, openReport } from '../lib/report';

const today = () => new Date().toISOString().slice(0, 10);

function Card({ label, value, sub, tone = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <span className="block text-xs text-gray-500 font-medium">{label}</span>
      <strong className={`block text-xl font-extrabold mt-0.5 ${tone}`}>{value}</strong>
      {sub && <span className="block text-[11px] text-gray-400">{sub}</span>}
    </div>
  );
}

function ActionButton({ icon: Icon, children, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'}`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function filtersText(f, status) {
  const parts = [];
  if (status !== 'all') parts.push(`status ${status.replace('_', ' ')}`);
  if (f.query) parts.push(`busca “${f.query}”`);
  if (f.delivery !== 'all') parts.push(f.delivery === 'entrega' ? 'só entrega' : 'só retirada');
  return parts.join(' · ');
}

export default function CatalogOrdersManager({ orders, onDelete, onSelectOrder, onUpdateStatus }) {
  const { confirm, toast } = useUI();
  const { storeName } = useSettings();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [status, setStatus] = useState('all');

  // "scoped" ignora o status (para os números dos chips); "visible" é o que aparece na lista
  const scoped = useMemo(() => filterOrders(orders, { ...filters, status: 'all' }), [orders, filters]);
  const visible = useMemo(() => (status === 'all' ? scoped : filterOrders(scoped, { status, sort: filters.sort })), [scoped, status, filters.sort]);
  const counts = useMemo(() => Object.fromEntries(summarize(scoped).byStatus.map(s => [s.id, s.count])), [scoped]);
  const sum = useMemo(() => summarize(visible), [visible]);

  const handleDelete = async (order) => {
    const ok = await confirm({ title: 'Excluir pedido', message: `Excluir o pedido de ${order.client_name}? Isso não pode ser desfeito.` });
    if (ok) onDelete(order.id);
  };

  const exportOrders = () => { const { header, rows } = ordersCsv(visible); downloadCsv(`pedidos-${today()}.csv`, header, rows); };
  const exportItems = () => { const { header, rows } = itemsCsv(visible); downloadCsv(`itens-dos-pedidos-${today()}.csv`, header, rows); };
  const report = () => {
    const html = buildReportHtml({ storeName, periodText: periodLabel(filters.period, filters.from, filters.to), filterText: filtersText(filters, status), orders: visible });
    if (!openReport(html)) toast.error('O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.');
  };

  const filtered = filters.query || filters.period !== 'all' || filters.delivery !== 'all' || status !== 'all';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h2 className="text-lg font-medium text-gray-900">Vendas do Catálogo ({orders.length})</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={FileBarChart} onClick={report} disabled={visible.length === 0} primary>Relatório</ActionButton>
          <ActionButton icon={Download} onClick={exportOrders} disabled={visible.length === 0}>Planilha de pedidos</ActionButton>
          <ActionButton icon={Download} onClick={exportItems} disabled={visible.length === 0}>Planilha de itens</ActionButton>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhum pedido realizado</h3>
          <p className="mt-1 text-sm text-gray-500">Quando os clientes realizarem compras no carrinho da vitrine, os pedidos aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="resumo-pedidos">
            <Card label={filtered ? 'Pedidos (filtrados)' : 'Pedidos'} value={sum.count} sub={sum.cancelled ? `${sum.cancelled} cancelado(s)` : `${sum.units} unidade(s)`} />
            <Card label="Faturamento" value={brl(sum.revenue)} sub="sem cancelados" tone="text-blue-600" />
            <Card label="Ticket médio" value={brl(sum.ticket)} />
            <Card label="Aguardando resposta" value={sum.novos} sub="pedidos com status Novo" tone={sum.novos ? 'text-red-600' : 'text-gray-900'} />
          </div>

          <OrderFilters value={filters} onChange={setFilters} showDelivery />
          <StatusChips counts={counts} total={scoped.length} value={status} onChange={setStatus} />

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Nenhum pedido com estes filtros.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visible.map(order => <OrderCard key={order.id} order={order} onSelect={onSelectOrder} onDelete={handleDelete} onUpdateStatus={onUpdateStatus} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onSelect, onDelete, onUpdateStatus }) {
  const age = ageInfo(order);
  const items = order.items || [];
  const first = items.slice(0, 2);
  const extra = items.length - first.length;
  const delivery = order.delivery_method === 'entrega';
  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`bg-white border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${age.stale ? 'border-red-300' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900 text-base truncate min-w-0">{order.client_name}</h3>
        <div className="flex items-center gap-0.5 flex-shrink-0 -mt-1 -mr-1">
          <a
            href={whatsappLink(`55${toWhatsappDigits(order.client_phone)}`, `Olá ${order.client_name}! Recebi seu pedido pelo site.`)}
            target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-[#25D366] hover:bg-green-50 rounded transition-colors" title="Chamar no WhatsApp" aria-label="Chamar no WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(order); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Excluir" aria-label="Excluir pedido"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2 text-xs">
        <span className="text-blue-600 font-medium">{order.client_phone}</span>
        <span className="text-gray-400" title={new Date(order.created_at).toLocaleString('pt-BR')}>{orderCode(order)} · {age.label}</span>
        {age.stale && <span className="inline-flex items-center gap-1 font-semibold text-red-600"><AlertTriangle className="w-3 h-3" /> sem resposta</span>}
      </div>
      <ul className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 mb-2 space-y-0.5">
        {first.map((i, idx) => {
          const opt = formatOptions(i.options);
          return <li key={idx} className="truncate">{i.quantity}x {i.title}{opt && <span className="text-gray-400"> ({opt})</span>}</li>;
        })}
        {extra > 0 && <li className="text-gray-400">+ {extra} item(ns)</li>}
      </ul>
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5 min-w-0">
        {delivery ? <Truck className="w-3.5 h-3.5 flex-shrink-0" /> : <Store className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="truncate">{delivery ? (order.delivery_address || 'Entrega — endereço não informado') : order.delivery_method ? 'Retirada' : 'Recebimento não informado'}</span>
      </p>
      {order.notes && <p className="text-xs text-gray-500 italic mb-2 line-clamp-1">“{order.notes}”</p>}
      <div className="flex items-center justify-between gap-2 mt-3">
        <StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} />
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900">{brl(order.total)}</span>
          <span className="hidden sm:flex text-xs font-semibold text-blue-600 hover:underline items-center gap-1">Ver <ExternalLink className="w-3 h-3" /></span>
        </div>
      </div>
    </div>
  );
}
