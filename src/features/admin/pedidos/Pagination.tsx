import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES, pageButtons } from '../../../lib/pagination';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (n: number) => void;
  noun?: string; // "pedidos", "solicitações"
  position?: 'top' | 'bottom';
  extra?: ReactNode; // controle à esquerda da paginação (ex.: alternar cards/lista)
}

const btn = 'min-w-[2.25rem] h-9 px-2 inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

// Rodapé da lista: "Mostrando 1–10 de 32", botões de página e itens por página
export default function Pagination({ page, pages, total, from, to, perPage, onPage, onPerPage, noun = 'pedidos', position = 'bottom', extra }: PaginationProps) {
  if (total === 0) return extra ? <div className="mb-4 flex justify-start">{extra}</div> : null;
  return (
    <nav aria-label={position === 'top' ? 'Páginas, topo da lista' : 'Paginação'} className={`${position === 'top' ? 'mb-4' : 'mt-6'} flex flex-wrap items-center justify-between gap-3`}>
      <div className="flex flex-wrap items-center gap-3">
        {extra}
        <p className="text-sm text-gray-500" aria-live={position === 'top' ? 'off' : 'polite'}>Mostrando {from}–{to} de {total} {noun}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-500">
          Por página
          <select
            value={perPage} onChange={e => onPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded-md bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={`${btn} border-gray-300 bg-white hover:bg-gray-50 text-gray-700`}><ChevronLeft className="w-4 h-4" /></button>
            {pageButtons(page, pages).map((n, i) => n === null
              ? <span key={`gap-${i}`} className="px-1 text-gray-400" aria-hidden="true">…</span>
              : <button
                  key={n} type="button" onClick={() => onPage(n)}
                  aria-label={`Página ${n}`} aria-current={n === page ? 'page' : undefined}
                  className={`${btn} ${n === page ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'}`}
                >{n}</button>)}
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Próxima página" className={`${btn} border-gray-300 bg-white hover:bg-gray-50 text-gray-700`}><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </nav>
  );
}
