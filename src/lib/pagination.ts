// Paginação simples de listas em memória.
export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface PageInfo<T> {
  items: T[];
  page: number;       // página atual (1 = primeira), já ajustada ao limite
  pages: number;      // total de páginas (no mínimo 1)
  total: number;
  from: number;       // posição do primeiro item exibido (0 se a lista é vazia)
  to: number;         // posição do último item exibido
}

export function paginate<T>(list: T[], page: number, perPage: number): PageInfo<T> {
  const size = Math.max(1, Math.floor(perPage) || DEFAULT_PAGE_SIZE);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);
  return { items, page: current, pages, total, from: total ? start + 1 : 0, to: start + items.length };
}

// Números de página para os botões: 1 … 4 5 6 … 12 (null = reticências)
export function pageButtons(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) { set.add(2); set.add(3); set.add(4); }
  if (page >= pages - 2) { set.add(pages - 1); set.add(pages - 2); set.add(pages - 3); }
  const sorted = [...set].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push(null); out.push(n); });
  return out;
}

// Tamanho de página escolhido pelo admin, lembrado neste navegador
const KEY = 'catalogo-pedidos-por-pagina';
export function loadPageSize(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
  } catch { return DEFAULT_PAGE_SIZE; }
}
export function savePageSize(n: number): void {
  try { localStorage.setItem(KEY, String(n)); } catch { /* armazenamento indisponível: só não lembra */ }
}

// Como a lista de pedidos é exibida (cards ou lista), lembrado neste navegador
export type ViewMode = 'cards' | 'lista';
const VIEW_KEY = 'catalogo-pedidos-visao';
export function loadViewMode(): ViewMode {
  try { return localStorage.getItem(VIEW_KEY) === 'lista' ? 'lista' : 'cards'; } catch { return 'cards'; }
}
export function saveViewMode(v: ViewMode): void {
  try { localStorage.setItem(VIEW_KEY, v); } catch { /* armazenamento indisponível: só não lembra */ }
}
