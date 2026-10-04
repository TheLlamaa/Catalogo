import { useMemo, useState } from 'react';
import { loadPageSize, paginate, savePageSize } from '../lib/pagination';

// Página atual + itens por página. A página volta para 1 sempre que resetKey muda (filtros, busca…).
export function usePagination<T>(list: T[], resetKey: string) {
  const [perPage, setPerPageState] = useState(loadPageSize);
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const requested = state.key === resetKey ? state.page : 1;
  const info = useMemo(() => paginate(list, requested, perPage), [list, requested, perPage]);

  const setPage = (page: number) => setState({ key: resetKey, page });
  const setPerPage = (n: number) => { savePageSize(n); setPerPageState(n); setState({ key: resetKey, page: 1 }); };
  return { ...info, perPage, setPage, setPerPage };
}
