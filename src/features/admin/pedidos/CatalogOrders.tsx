import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Trash2, ExternalLink, ShoppingBag, Download, FileBarChart, MessageSquare, Truck, Store, AlertTriangle } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import { useSettings } from '../../../components/SettingsContext';
import { StatusSelect } from './StatusSelect';
import Pagination from './Pagination';
import ViewToggle from './ViewToggle';
import { useViewMode } from '../../../hooks/useViewMode';
import { usePagination } from '../../../hooks/usePagination';
import { OrderFilters, StatusChips, DEFAULT_FILTERS } from './OrderFilters';
import type { OrderFiltersValue } from './OrderFilters';
import { brl, downloadCsv, formatOptions, toWhatsappDigits, whatsappLink } from '../../../lib/format';
import { ageInfo, filterOrders, itemsCsv, orderCode, ordersCsv, periodLabel, summarize } from '../../../lib/orders';
import { buildReportHtml, openReport } from '../../../lib/report';
import type { CatalogOrder, OrderStatusId } from '../../../types';

const today = () => new Date().toISOString().slice(0, 10);

interface CardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}

function Card({ label, value, sub, tone = 'text-gray-900' }: CardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <span className="block text-xs text-gray-500 font-medium">{label}</span>
      <strong className={`block text-xl font-extrabold mt-0.5 ${tone}`}>{value}</strong>
      {sub && <span className="block text-[11px] text-gray-400">{sub}</span>}
    </div>
  );
}

interface ActionButtonProps {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function ActionButton({ icon: Icon, children, onClick, disabled, primary }: ActionButtonProps) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'}`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function filtersText(f: OrderFiltersValue, status: string) {
  const parts: string[] = [];
  if (status !== 'all') parts.push(`status ${status.replace('_', ' ')}`);
  if (f.query) parts.push(`busca “${f.query}”`);
  if (f.delivery !== 'all') parts.push(f.delivery === 'entrega' ? 'só entrega' : 'só retirada');
  return parts.join(' · ');
}

interface CatalogOrdersManagerProps {
  orders: CatalogOrder[];
  onDelete: (id: string) => unknown;
  onSelectOrder: (id: string) => void;
  onUpdateStatus: (id: string, status: OrderStatusId) => unknown;
}

export default function CatalogOrdersManager({ orders, onDelete, onSelectOrder, onUpdateStatus }: CatalogOrdersManagerProps) {
  const { confirm, toast } = useUI();
  const { storeName } = useSettings();
  const [filters, setFilters] = useState<OrderFiltersValue>(DEFAULT_FILTERS);
  const [status, setStatus] = useState('all');

  // "scoped" ignora o status (para os números dos chips); "visible" é o que aparece na lista
  const scoped = useMemo(() => filterOrders(orders, { ...filters, status: 'all' }), [orders, filters]);
  const visible = useMemo(() => (status === 'all' ? scoped : filterOrders(scoped, { status, sort: filters.sort })), [scoped, status, filters.sort]);
  const counts = useMemo(() => Object.fromEntries(summarize(scoped).byStatus.map(s => [s.id, s.count])), [scoped]);
  const sum = useMemo(() => summarize(visible), [visible]);
  const pager = usePagination(visible, JSON.stringify([filters, status]));
  const [view, setView] = useViewMode();

  const handleDelete = async (order: CatalogOrder) => {
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
          <p className="mt-1 text-sm text-gray-500">Os pedidos feitos no carrinho da vitrine aparecem aqui.</p>
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
            <>
              <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="pedidos" position="top" extra={<ViewToggle value={view} onChange={setView} />} />
              {view === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pager.items.map(order => <OrderCard key={order.id} order={order} onSelect={onSelectOrder} onDelete={handleDelete} onUpdateStatus={onUpdateStatus} />)}
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                  <table className="w-full text-sm text-left" data-testid="lista-pedidos">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Cliente</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Itens</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Recebimento</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold text-right">Total</th>
                        <th scope="col" className="px-3 py-2.5"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pager.items.map(order => <OrderRow key={order.id} order={order} onSelect={onSelectOrder} onDelete={handleDelete} onUpdateStatus={onUpdateStatus} />)}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="pedidos" />
            </>
          )}
        </>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: CatalogOrder;
  onSelect: (id: string) => void;
  onDelete: (order: CatalogOrder) => void;
  onUpdateStatus: (id: string, status: OrderStatusId) => unknown;
}

function OrderCard({ order, onSelect, onDelete, onUpdateStatus }: OrderCardProps) {
  const age = ageInfo(order);
  const items = order.items || [];
  const first = items.slice(0, 2);
  const extra = items.length - first.length;
  const delivery = order.delivery_method === 'entrega';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(order.id)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(order.id); } }}
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

// Uma linha do modo "Lista": mesmas informações do card, em formato compacto
function OrderRow({ order, onSelect, onDelete, onUpdateStatus }: OrderCardProps) {
  const age = ageInfo(order);
  const items = order.items || [];
  const delivery = order.delivery_method === 'entrega';
  const summary = items.map(i => `${i.quantity}x ${i.title}`).join(', ');
  return (
    <tr
      data-order-row
      tabIndex={0}
      onClick={() => onSelect(order.id)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(order.id); } }}
      className={`cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 outline-none ${age.stale ? 'bg-red-50/40' : ''}`}
    >
      <td className="px-3 py-2.5 align-top min-w-[11rem]">
        <span className="block font-semibold text-gray-900 truncate max-w-[14rem]">{order.client_name}</span>
        <span className="block text-xs text-blue-600 font-medium">{order.client_phone}</span>
        <span className="block text-xs text-gray-400" title={new Date(order.created_at).toLocaleString('pt-BR')}>
          {orderCode(order)} · {age.label}
          {age.stale && <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-red-600"><AlertTriangle className="w-3 h-3" /> sem resposta</span>}
        </span>
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-gray-600 max-w-[16rem]"><span className="line-clamp-2" title={summary}>{summary}</span></td>
      <td className="px-3 py-2.5 align-top text-xs text-gray-500 min-w-[9rem]">
        <span className="flex items-center gap-1.5">
          {delivery ? <Truck className="w-3.5 h-3.5 flex-shrink-0" /> : <Store className="w-3.5 h-3.5 flex-shrink-0" />}
          <span className="line-clamp-2">{delivery ? (order.delivery_address || 'Endereço não informado') : order.delivery_method ? 'Retirada' : '—'}</span>
        </span>
      </td>
      <td className="px-3 py-2.5 align-top" onClick={(e) => e.stopPropagation()}><StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} /></td>
      <td className="px-3 py-2.5 align-top text-right font-bold text-gray-900 whitespace-nowrap">{brl(order.total)}</td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-center justify-end gap-0.5">
          <a
            href={whatsappLink(`55${toWhatsappDigits(order.client_phone)}`, `Olá ${order.client_name}! Recebi seu pedido pelo site.`)}
            target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-[#25D366] hover:bg-green-50 rounded transition-colors" title="Chamar no WhatsApp" aria-label="Chamar no WhatsApp"
          ><MessageSquare className="w-4 h-4" /></a>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(order); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir" aria-label="Excluir pedido"
          ><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}
