import { useMemo, useState } from 'react';
import { Trash2, ExternalLink, FileText, Download, Image as ImageIcon } from 'lucide-react';
import ProductImage from '../../vitrine/ProductImage';
import { useUI } from '../../../components/UIContext';
import { StatusSelect } from './StatusSelect';
import Pagination from './Pagination';
import ViewToggle from './ViewToggle';
import { useViewMode } from '../../../hooks/useViewMode';
import { usePagination } from '../../../hooks/usePagination';
import { OrderFilters, StatusChips, DEFAULT_FILTERS } from './OrderFilters';
import type { OrderFiltersValue } from './OrderFilters';
import { downloadCsv, statusInfo } from '../../../lib/format';
import { ageInfo, filterOrders, orderCode, summarize } from '../../../lib/orders';
import type { CustomOrder, OrderStatusId } from '../../../types';

const today = () => new Date().toISOString().slice(0, 10);
const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR');

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
    >
      <Download className="w-4 h-4" /> Exportar CSV
    </button>
  );
}

interface CustomOrdersManagerProps {
  customOrders: CustomOrder[];
  onDelete: (id: string) => unknown;
  onSelectOrder: (id: string) => void;
  onUpdateStatus: (id: string, status: OrderStatusId) => unknown;
}

export function CustomOrdersManager({ customOrders, onDelete, onSelectOrder, onUpdateStatus }: CustomOrdersManagerProps) {
  const { confirm } = useUI();
  const [filters, setFilters] = useState<OrderFiltersValue>(DEFAULT_FILTERS);
  const [filter, setFilter] = useState('all');
  const scoped = useMemo(() => filterOrders(customOrders, { ...filters, status: 'all' }), [customOrders, filters]);
  const visible = useMemo(() => (filter === 'all' ? scoped : filterOrders(scoped, { status: filter, sort: filters.sort })), [scoped, filter, filters.sort]);
  const counts = useMemo(() => Object.fromEntries(summarize(scoped).byStatus.map(x => [x.id, x.count])), [scoped]);
  const pager = usePagination(visible, JSON.stringify([filters, filter]));
  const [view, setView] = useViewMode();

  const handleDelete = async (order: CustomOrder) => {
    const ok = await confirm({ title: 'Excluir solicitação', message: `Excluir a solicitação de ${order.client_name}? Isso não pode ser desfeito.` });
    if (ok) onDelete(order.id);
  };

  const exportCsv = () => downloadCsv(
    `pedidos-personalizados-${today()}.csv`,
    ['Data', 'Cliente', 'WhatsApp', 'Descrição', 'Tem foto', 'Status'],
    visible.map(o => [dateTime(o.created_at), o.client_name, o.client_phone, o.description, o.image_url ? 'Sim' : 'Não', statusInfo(o.status).label])
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h2 className="text-lg font-medium text-gray-900">Solicitações de Peças Personalizadas ({customOrders.length})</h2>
        <ExportButton onClick={exportCsv} disabled={visible.length === 0} />
      </div>

      {customOrders.length > 0 && (
        <>
          <OrderFilters value={filters} onChange={setFilters} placeholder="Buscar por cliente, telefone ou descrição" />
          <StatusChips counts={counts} total={scoped.length} value={filter} onChange={setFilter} />
        </>
      )}

      {customOrders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhuma solicitação recebida</h3>
          <p className="mt-1 text-sm text-gray-500">Os pedidos personalizados enviados pelo site aparecem aqui.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">Nenhuma solicitação com estes filtros.</p>
      ) : (
        <>
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="solicitações" position="top" extra={<ViewToggle value={view} onChange={setView} />} />
        {view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pager.items.map(order => (
            <div
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectOrder(order.id)}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectOrder(order.id); } }}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4 items-start relative group"
            >
              {order.image_url ? (
                <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <ProductImage src={order.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">{order.client_name}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2 text-xs">
                  <span className="text-blue-600 font-medium">{order.client_phone}</span>
                  <span className="text-gray-400" title={dateTime(order.created_at)}>{orderCode(order)} · {ageInfo(order).label}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded border border-gray-100 mb-3">{order.description}</p>
                <StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} />
              </div>

              <div className="flex flex-col gap-1 items-end self-stretch">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir" aria-label="Excluir solicitação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-blue-600 hover:underline mt-auto flex items-center gap-1">
                  Ver <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
        ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
          <table className="w-full text-sm text-left" data-testid="lista-pedidos">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">Cliente</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Descrição</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Foto</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pager.items.map(order => (
                <tr
                  key={order.id} data-order-row tabIndex={0}
                  onClick={() => onSelectOrder(order.id)}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectOrder(order.id); } }}
                  className="cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 outline-none"
                >
                  <td className="px-3 py-2.5 align-top min-w-[11rem]">
                    <span className="block font-semibold text-gray-900 truncate max-w-[14rem]">{order.client_name}</span>
                    <span className="block text-xs text-blue-600 font-medium">{order.client_phone}</span>
                    <span className="block text-xs text-gray-400" title={dateTime(order.created_at)}>{orderCode(order)} · {ageInfo(order).label}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-gray-600 max-w-[22rem]"><span className="line-clamp-2" title={order.description}>{order.description}</span></td>
                  <td className="px-3 py-2.5 align-top text-xs text-gray-500">{order.image_url ? 'Sim' : '—'}</td>
                  <td className="px-3 py-2.5 align-top" onClick={(e) => e.stopPropagation()}><StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} /></td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir" aria-label="Excluir solicitação"
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="solicitações" />
        </>
      )}
    </div>
  );
}
