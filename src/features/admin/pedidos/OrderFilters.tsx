import { Search, X } from 'lucide-react';
import { PERIODS, SORTS } from '../../../lib/orders';
import { ORDER_STATUS } from '../../../lib/format';

// Estado dos filtros de busca, período, recebimento e ordenação
export interface OrderFiltersValue {
  query: string;
  period: string;
  from: string;
  to: string;
  delivery: string;
  sort: string;
}

export const DEFAULT_FILTERS: OrderFiltersValue = { query: '', period: 'all', from: '', to: '', delivery: 'all', sort: 'recent' };

const selectCls = 'flex-1 sm:flex-none min-w-[9rem] border border-gray-300 rounded-md bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500';

// Busca, período, recebimento e ordenação (os chips de status ficam em StatusChips)
interface OrderFiltersProps {
  value: OrderFiltersValue;
  onChange: (value: OrderFiltersValue) => void;
  showDelivery?: boolean;
  placeholder?: string;
}

export function OrderFilters({ value, onChange, showDelivery = false, placeholder }: OrderFiltersProps) {
  const set = (patch: Partial<OrderFiltersValue>) => onChange({ ...value, ...patch });
  const active = value.query || value.period !== 'all' || value.delivery !== 'all' || value.sort !== 'recent';
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[12rem]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search" aria-label="Buscar pedidos" placeholder={placeholder || 'Buscar por cliente, telefone, produto ou código'}
            value={value.query} onChange={e => set({ query: e.target.value })}
            className="w-full border border-gray-300 rounded-md bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select aria-label="Período" value={value.period} onChange={e => set({ period: e.target.value })} className={selectCls}>
          {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {showDelivery && (
          <select aria-label="Recebimento" value={value.delivery} onChange={e => set({ delivery: e.target.value })} className={selectCls}>
            <option value="all">Qualquer recebimento</option>
            <option value="entrega">Só entrega</option>
            <option value="retirada">Só retirada</option>
          </select>
        )}
        <select aria-label="Ordenar por" value={value.sort} onChange={e => set({ sort: e.target.value })} className={selectCls}>
          {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {active && (
          <button onClick={() => onChange(DEFAULT_FILTERS)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-2">
            <X className="w-4 h-4" /> Limpar
          </button>
        )}
      </div>
      {value.period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <label className="flex items-center gap-2">De <input type="date" aria-label="Data inicial" value={value.from} max={value.to || undefined} onChange={e => set({ from: e.target.value })} className={selectCls} /></label>
          <label className="flex items-center gap-2">até <input type="date" aria-label="Data final" value={value.to} min={value.from || undefined} onChange={e => set({ to: e.target.value })} className={selectCls} /></label>
        </div>
      )}
    </div>
  );
}

interface StatusChipsProps {
  counts: Record<string, number>;
  total: number;
  value: string;
  onChange: (value: string) => void;
}

export function StatusChips({ counts, total, value, onChange }: StatusChipsProps) {
  const chip = (id: string, label: string, n: number) => (
    <button
      key={id} onClick={() => onChange(id)} aria-pressed={value === id}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${value === id ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
    >
      {label} <span className={value === id ? "text-slate-300 dark:text-slate-600" : "text-gray-500"}>({n})</span>
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {chip('all', 'Todos', total)}
      {ORDER_STATUS.map(s => chip(s.id, s.label, counts[s.id] || 0))}
    </div>
  );
}
