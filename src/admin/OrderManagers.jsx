import { useState } from 'react';
import { Trash2, ExternalLink, ShoppingBag, FileText, Download, Image as ImageIcon } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { useUI } from '../components/UIContext';
import { StatusSelect } from './StatusSelect';
import { ORDER_STATUS, brl, downloadCsv, formatOptions, statusInfo } from '../lib/format';

const today = () => new Date().toISOString().slice(0, 10);
const dateTime = (iso) => new Date(iso).toLocaleString('pt-BR');

function StatusFilter({ orders, value, onChange }) {
  const count = (id) => orders.filter(o => statusInfo(o.status).id === id).length;
  const chip = (id, label, n) => (
    <button
      key={id}
      onClick={() => onChange(id)}
      aria-pressed={value === id}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${value === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
    >
      {label} <span className="opacity-70">({n})</span>
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {chip('all', 'Todos', orders.length)}
      {ORDER_STATUS.map(s => chip(s.id, s.label, count(s.id)))}
    </div>
  );
}

function ExportButton({ onClick, disabled }) {
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

export function CatalogOrdersManager({ orders, onDelete, onSelectOrder, onUpdateStatus }) {
  const { confirm } = useUI();
  const [filter, setFilter] = useState('all');
  const visible = orders.filter(o => filter === 'all' || statusInfo(o.status).id === filter);

  const handleDelete = async (order) => {
    const ok = await confirm({ title: 'Excluir pedido', message: `Excluir o pedido de ${order.client_name}? Isso não pode ser desfeito.` });
    if (ok) onDelete(order.id);
  };

  const exportCsv = () => downloadCsv(
    `pedidos-${today()}.csv`,
    ['Data', 'Cliente', 'WhatsApp', 'Itens', 'Total', 'Recebimento', 'Endereço', 'Observações', 'Status'],
    visible.map(o => [
      dateTime(o.created_at), o.client_name, o.client_phone,
      (o.items || []).map(i => { const opt = formatOptions(i.options); return `${i.quantity}x ${i.title}${opt ? ` (${opt})` : ''}`; }).join(' | '),
      Number(o.total || 0).toFixed(2).replace('.', ','),
      o.delivery_method === 'entrega' ? 'Entrega' : o.delivery_method ? 'Retirada' : '',
      o.delivery_address || '', o.notes || '', statusInfo(o.status).label
    ])
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h2 className="text-lg font-medium text-gray-900">Vendas do Catálogo ({orders.length})</h2>
        <ExportButton onClick={exportCsv} disabled={visible.length === 0} />
      </div>

      {orders.length > 0 && <StatusFilter orders={orders} value={filter} onChange={setFilter} />}

      {orders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhum pedido realizado</h3>
          <p className="mt-1 text-sm text-gray-500">Quando os clientes realizarem compras no carrinho da vitrine, os pedidos aparecerão aqui.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">Nenhum pedido com este status.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-start relative group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{order.client_name}</h3>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-blue-600 font-medium mb-2">{order.client_phone}</p>
                {order.notes && <p className="text-xs text-gray-500 italic mb-2 line-clamp-1">“{order.notes}”</p>}
                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 flex items-center justify-between mb-3">
                  <span>{order.items?.length || 0} item(ns){order.delivery_method === 'entrega' ? ' · entrega' : order.delivery_method ? ' · retirada' : ''}</span>
                  <span className="font-bold text-gray-900">{brl(order.total)}</span>
                </div>
                <StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} />
              </div>

              <div className="flex flex-col gap-1 items-end self-stretch">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir" aria-label="Excluir pedido"
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
      )}
    </div>
  );
}

export function CustomOrdersManager({ customOrders, onDelete, onSelectOrder, onUpdateStatus }) {
  const { confirm } = useUI();
  const [filter, setFilter] = useState('all');
  const visible = customOrders.filter(o => filter === 'all' || statusInfo(o.status).id === filter);

  const handleDelete = async (order) => {
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

      {customOrders.length > 0 && <StatusFilter orders={customOrders} value={filter} onChange={setFilter} />}

      {customOrders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhuma solicitação recebida</h3>
          <p className="mt-1 text-sm text-gray-500">Quando os clientes enviarem pedidos personalizados pelo site, eles aparecerão aqui.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">Nenhuma solicitação com este status.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
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
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{order.client_name}</h3>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-blue-600 font-medium mb-2">{order.client_phone}</p>
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
      )}
    </div>
  );
}
